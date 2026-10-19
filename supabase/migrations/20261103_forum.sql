-- Migration: le forum
--
-- Tout le monde lit (anon compris : /forum est public et reference), il
-- faut un compte pour ecrire. L'equipe (is_staff, cf. 20261101_staff)
-- modere : epingler, verrouiller, masquer, deplacer, traiter les
-- signalements.
--
-- - Un sujet est une question qui attend une reponse : son auteur choisit la
--   meilleure (solved_reply_id, datee par solved_at : le badge « Entraide »
--   en part), les reponses se votent (+1).
-- - On suit un sujet (forum_topic_follows) : son auteur et ceux qui y
--   repondent le suivent d'office, chacun peut s'en desabonner. Une
--   nouvelle reponse previent tous ceux qui suivent.
-- - Texte brut (pas de HTML) : l'app garde les retours a la ligne et rend
--   les liens cliquables. Jusqu'a 4 photos (bucket `forum`).
-- - gear : la fiche d'un instrument de son Matos, recopiee a la creation
--   (marque, modele, annee, photo — ni numero de serie ni prix). Le Matos
--   reste prive ; le sujet, lui, est public.
-- - Recherche plein texte (config 'simple' : le forum est bilingue).
-- - Garde-fous : 5 sujets et 60 reponses par 24 h hors equipe.

DO $$ BEGIN
  CREATE TYPE forum_category AS ENUM (
    'gear_buying', 'setup_repair', 'technique', 'theory',
    'home_studio', 'band_stage', 'introductions', 'off_topic'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE forum_report_reason AS ENUM ('spam', 'abuse', 'off_topic', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === Sujets ===
CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  locale TEXT NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  category forum_category NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 8 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 10000),
  instruments instrument[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(images) <= 4),
  gear JSONB,
  solved_reply_id UUID,
  solved_at TIMESTAMP WITH TIME ZONE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  search TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) STORED
);

CREATE INDEX IF NOT EXISTS forum_topics_activity_idx
  ON forum_topics (is_pinned DESC, last_activity_at DESC) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS forum_topics_category_idx
  ON forum_topics (category, last_activity_at DESC) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS forum_topics_author_idx ON forum_topics (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_topics_search_idx ON forum_topics USING GIN (search);

-- === Reponses ===
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 2 AND 10000),
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forum_replies_topic_idx ON forum_replies (topic_id, created_at);
CREATE INDEX IF NOT EXISTS forum_replies_author_idx ON forum_replies (author_id, created_at DESC);

DO $$ BEGIN
  ALTER TABLE forum_topics
    ADD CONSTRAINT forum_topics_solved_reply_fkey
    FOREIGN KEY (solved_reply_id) REFERENCES forum_replies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === Votes (+1 sur une reponse) ===
CREATE TABLE IF NOT EXISTS forum_reply_votes (
  reply_id UUID NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reply_id, user_id)
);

-- === Signalements ===
CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason forum_report_reason NOT NULL,
  note TEXT CHECK (char_length(note) <= 500),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK ((topic_id IS NULL) <> (reply_id IS NULL))
);

-- Un signalement ouvert par personne et par contenu
CREATE UNIQUE INDEX IF NOT EXISTS forum_reports_once_topic
  ON forum_reports (reporter_id, topic_id) WHERE resolved_at IS NULL AND topic_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS forum_reports_once_reply
  ON forum_reports (reporter_id, reply_id) WHERE resolved_at IS NULL AND reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS forum_reports_open_idx
  ON forum_reports (created_at) WHERE resolved_at IS NULL;

-- =============================================
-- Triggers
-- =============================================
-- Les garde-fous (BEFORE) ne sont pas SECURITY DEFINER : ils lisent
-- current_user pour ne brider que les requetes des utilisateurs. Les
-- compteurs (AFTER) le sont : repondre met a jour le sujet d'un autre, et
-- leurs ecritures (faites en tant que proprietaire) passent les garde-fous.

-- Sujet cree : garde-fou de frequence, compteurs a zero, drapeaux de
-- moderation reserves a l'equipe.
CREATE OR REPLACE FUNCTION forum_topics_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NOT is_staff() THEN
      IF (SELECT count(*) FROM forum_topics
          WHERE author_id = NEW.author_id AND created_at > NOW() - INTERVAL '24 hours') >= 5 THEN
        RAISE EXCEPTION 'forum_rate_limit' USING ERRCODE = 'P0001';
      END IF;
      NEW.is_pinned := false;
      NEW.is_locked := false;
    END IF;
    NEW.is_hidden := false;
    NEW.reply_count := 0;
    NEW.solved_reply_id := NULL;
    NEW.solved_at := NULL;
    NEW.edited_at := NULL;
    NEW.created_at := NOW();
    NEW.last_activity_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_topics_before_insert ON forum_topics;
CREATE TRIGGER forum_topics_before_insert
  BEFORE INSERT ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION forum_topics_before_insert();

-- Sujet modifie : l'auteur change son texte et choisit la meilleure
-- reponse ; l'equipe epingle, verrouille, masque, deplace. Le reste ne
-- bouge pas.
CREATE OR REPLACE FUNCTION forum_topics_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN;
  v_author BOOLEAN;
BEGIN
  -- Compteurs tenus par les triggers des reponses (postgres) : libres.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  v_staff := is_staff();
  v_author := auth.uid() = OLD.author_id;

  NEW.id := OLD.id;
  NEW.author_id := OLD.author_id;
  NEW.slug := OLD.slug;
  NEW.created_at := OLD.created_at;
  NEW.reply_count := OLD.reply_count;
  NEW.last_activity_at := OLD.last_activity_at;
  NEW.solved_at := OLD.solved_at;
  NEW.gear := CASE WHEN v_author THEN NEW.gear ELSE OLD.gear END;

  IF NOT v_staff THEN
    NEW.is_pinned := OLD.is_pinned;
    NEW.is_locked := OLD.is_locked;
    NEW.is_hidden := OLD.is_hidden;
  END IF;

  -- Le texte n'appartient qu'a son auteur (l'equipe masque, elle ne
  -- reecrit pas) ; la rubrique, l'auteur ou l'equipe (deplacer).
  IF NOT v_author THEN
    NEW.title := OLD.title;
    NEW.body := OLD.body;
    NEW.instruments := OLD.instruments;
    NEW.images := OLD.images;
    NEW.locale := OLD.locale;
    NEW.solved_reply_id := OLD.solved_reply_id;
    IF NOT v_staff THEN
      NEW.category := OLD.category;
    END IF;
  END IF;

  -- La meilleure reponse est une reponse visible de ce sujet
  IF NEW.solved_reply_id IS DISTINCT FROM OLD.solved_reply_id AND NEW.solved_reply_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM forum_replies
      WHERE id = NEW.solved_reply_id AND topic_id = NEW.id AND NOT is_hidden
    ) THEN
      RAISE EXCEPTION 'Reponse introuvable dans ce sujet';
    END IF;
  END IF;
  IF NEW.solved_reply_id IS DISTINCT FROM OLD.solved_reply_id THEN
    NEW.solved_at := CASE WHEN NEW.solved_reply_id IS NULL THEN NULL ELSE NOW() END;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := NOW();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_topics_before_update ON forum_topics;
CREATE TRIGGER forum_topics_before_update
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION forum_topics_before_update();

-- Reponse creee : garde-fou, sujet ni verrouille ni masque (sauf equipe).
CREATE OR REPLACE FUNCTION forum_replies_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_topic FROM forum_topics WHERE id = NEW.topic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sujet introuvable';
  END IF;

  IF NOT is_staff() THEN
    IF v_topic.is_locked OR v_topic.is_hidden THEN
      RAISE EXCEPTION 'forum_topic_locked' USING ERRCODE = 'P0001';
    END IF;
    IF (SELECT count(*) FROM forum_replies
        WHERE author_id = NEW.author_id AND created_at > NOW() - INTERVAL '24 hours') >= 60 THEN
      RAISE EXCEPTION 'forum_rate_limit' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.vote_count := 0;
  NEW.is_hidden := false;
  NEW.edited_at := NULL;
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_replies_before_insert ON forum_replies;
CREATE TRIGGER forum_replies_before_insert
  BEFORE INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_replies_before_insert();

-- Reponse modifiee : l'auteur change son texte, l'equipe masque.
CREATE OR REPLACE FUNCTION forum_replies_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.topic_id := OLD.topic_id;
  NEW.author_id := OLD.author_id;
  NEW.created_at := OLD.created_at;
  NEW.vote_count := OLD.vote_count;

  IF NOT is_staff() THEN
    NEW.is_hidden := OLD.is_hidden;
  END IF;
  IF auth.uid() <> OLD.author_id THEN
    NEW.body := OLD.body;
  END IF;

  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := NOW();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_replies_before_update ON forum_replies;
CREATE TRIGGER forum_replies_before_update
  BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_replies_before_update();

-- Compteur de reponses et date d'activite du sujet
CREATE OR REPLACE FUNCTION forum_replies_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic UUID := COALESCE(NEW.topic_id, OLD.topic_id);
BEGIN
  UPDATE forum_topics t
     SET reply_count = (SELECT count(*) FROM forum_replies r WHERE r.topic_id = v_topic AND NOT r.is_hidden),
         last_activity_at = CASE WHEN TG_OP = 'INSERT' THEN NOW() ELSE t.last_activity_at END,
         -- Une meilleure reponse masquee ne l'est plus
         solved_reply_id = CASE
           WHEN TG_OP = 'UPDATE' AND NEW.is_hidden AND t.solved_reply_id = NEW.id THEN NULL
           ELSE t.solved_reply_id
         END,
         solved_at = CASE
           WHEN TG_OP = 'UPDATE' AND NEW.is_hidden AND t.solved_reply_id = NEW.id THEN NULL
           ELSE t.solved_at
         END
   WHERE t.id = v_topic;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS forum_replies_after_change ON forum_replies;
CREATE TRIGGER forum_replies_after_change
  AFTER INSERT OR DELETE OR UPDATE OF is_hidden ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_replies_after_change();

-- Compteur de votes
CREATE OR REPLACE FUNCTION forum_votes_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reply UUID := COALESCE(NEW.reply_id, OLD.reply_id);
BEGIN
  UPDATE forum_replies
     SET vote_count = (SELECT count(*) FROM forum_reply_votes WHERE reply_id = v_reply)
   WHERE id = v_reply;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS forum_votes_after_change ON forum_reply_votes;
CREATE TRIGGER forum_votes_after_change
  AFTER INSERT OR DELETE ON forum_reply_votes
  FOR EACH ROW EXECUTE FUNCTION forum_votes_after_change();

-- =============================================
-- Suivre un sujet
-- =============================================
-- following = false : desabonne (la ligne reste, pour qu'une nouvelle
-- reponse ne reabonne pas d'office).
CREATE TABLE IF NOT EXISTS forum_topic_follows (
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS forum_topic_follows_topic_idx
  ON forum_topic_follows (topic_id) WHERE following;

-- L'auteur d'un sujet, puis chaque personne qui y repond, le suivent
CREATE OR REPLACE FUNCTION forum_auto_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deux branches, pas un CASE : PL/pgSQL prepare toute l'expression, et
  -- NEW.topic_id n'existe pas sur une ligne de forum_topics.
  IF TG_TABLE_NAME = 'forum_topics' THEN
    INSERT INTO forum_topic_follows (topic_id, user_id)
    VALUES (NEW.id, NEW.author_id)
    ON CONFLICT (topic_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO forum_topic_follows (topic_id, user_id)
    VALUES (NEW.topic_id, NEW.author_id)
    ON CONFLICT (topic_id, user_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS forum_topics_auto_follow ON forum_topics;
CREATE TRIGGER forum_topics_auto_follow
  AFTER INSERT ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION forum_auto_follow();

DROP TRIGGER IF EXISTS forum_replies_auto_follow ON forum_replies;
CREATE TRIGGER forum_replies_auto_follow
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_auto_follow();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reply_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topic_follows ENABLE ROW LEVEL SECURITY;

-- Ses abonnements seulement (la liste des abonnes se lit cote serveur,
-- avec le service role, pour envoyer les notifications)
DROP POLICY IF EXISTS "Users manage own follows" ON forum_topic_follows;
CREATE POLICY "Users manage own follows"
  ON forum_topic_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sujets : visibles de tous, sauf masques (l'auteur et l'equipe les voient)
DROP POLICY IF EXISTS "Anyone reads visible topics" ON forum_topics;
CREATE POLICY "Anyone reads visible topics"
  ON forum_topics FOR SELECT
  USING (NOT is_hidden OR auth.uid() = author_id OR is_staff());

DROP POLICY IF EXISTS "Users create topics" ON forum_topics;
CREATE POLICY "Users create topics"
  ON forum_topics FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Le detail de ce qui change est filtre par forum_topics_before_update
DROP POLICY IF EXISTS "Authors and staff update topics" ON forum_topics;
CREATE POLICY "Authors and staff update topics"
  ON forum_topics FOR UPDATE
  USING (auth.uid() = author_id OR is_staff());

DROP POLICY IF EXISTS "Authors and staff delete topics" ON forum_topics;
CREATE POLICY "Authors and staff delete topics"
  ON forum_topics FOR DELETE
  USING (auth.uid() = author_id OR is_staff());

-- Reponses : celles d'un sujet lisible, sauf masquees
DROP POLICY IF EXISTS "Anyone reads visible replies" ON forum_replies;
CREATE POLICY "Anyone reads visible replies"
  ON forum_replies FOR SELECT
  USING (
    (NOT is_hidden OR auth.uid() = author_id OR is_staff())
    AND EXISTS (SELECT 1 FROM forum_topics t WHERE t.id = topic_id)
  );

DROP POLICY IF EXISTS "Users reply" ON forum_replies;
CREATE POLICY "Users reply"
  ON forum_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors and staff update replies" ON forum_replies;
CREATE POLICY "Authors and staff update replies"
  ON forum_replies FOR UPDATE
  USING (auth.uid() = author_id OR is_staff());

DROP POLICY IF EXISTS "Authors and staff delete replies" ON forum_replies;
CREATE POLICY "Authors and staff delete replies"
  ON forum_replies FOR DELETE
  USING (auth.uid() = author_id OR is_staff());

-- Votes : on voit les siens (le total est sur la reponse) ; pas pour soi
DROP POLICY IF EXISTS "Users read own votes" ON forum_reply_votes;
CREATE POLICY "Users read own votes"
  ON forum_reply_votes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users vote for others" ON forum_reply_votes;
CREATE POLICY "Users vote for others"
  ON forum_reply_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM forum_replies r WHERE r.id = reply_id AND r.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users remove own votes" ON forum_reply_votes;
CREATE POLICY "Users remove own votes"
  ON forum_reply_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Signalements : on signale, l'equipe lit et traite
DROP POLICY IF EXISTS "Users report" ON forum_reports;
CREATE POLICY "Users report"
  ON forum_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND resolved_at IS NULL AND resolved_by IS NULL);

DROP POLICY IF EXISTS "Staff read reports" ON forum_reports;
CREATE POLICY "Staff read reports"
  ON forum_reports FOR SELECT
  USING (is_staff());

DROP POLICY IF EXISTS "Staff resolve reports" ON forum_reports;
CREATE POLICY "Staff resolve reports"
  ON forum_reports FOR UPDATE
  USING (is_staff())
  WITH CHECK (is_staff());

-- =============================================
-- Recherche
-- =============================================
-- Sujets visibles qui correspondent a la recherche, les plus pertinents
-- d'abord. Sert la barre de recherche et « Ces sujets ressemblent au
-- tien » (on cherche alors le titre en cours, en OU).
CREATE OR REPLACE FUNCTION search_forum_topics(
  p_query TEXT,
  p_locale TEXT DEFAULT NULL,
  p_any_word BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF forum_topics
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT CASE
      WHEN p_any_word THEN
        -- « regler action guitare » → regler | action | guitare (mots de 3+ lettres)
        NULLIF(array_to_string(ARRAY(
          SELECT quote_literal(w) || ':*'
          FROM regexp_split_to_table(lower(p_query), '[^[:alnum:]]+') AS w
          WHERE char_length(w) >= 3
        ), ' | '), '')::tsquery
      ELSE websearch_to_tsquery('simple', p_query)
    END AS query
  )
  SELECT t.*
  FROM forum_topics t, q
  WHERE q.query IS NOT NULL
    AND t.search @@ q.query
    AND NOT t.is_hidden
    AND (p_locale IS NULL OR t.locale = p_locale)
  ORDER BY ts_rank(t.search, q.query) DESC, t.last_activity_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

-- =============================================
-- Photos du forum
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum',
  'forum',
  true,
  8388608,  -- 8 MB
  -- Pas de HEIC : les navigateurs hors Safari ne l'affichent pas
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view forum images" ON storage.objects;
CREATE POLICY "Anyone can view forum images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum');

DROP POLICY IF EXISTS "Users upload forum images" ON storage.objects;
CREATE POLICY "Users upload forum images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forum'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own forum images" ON storage.objects;
CREATE POLICY "Users delete own forum images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'forum'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
