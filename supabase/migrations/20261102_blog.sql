-- Migration: le blog
--
-- Ecrit par l'equipe (profiles.staff_role, cf. 20261101_staff), lu par
-- tout le monde, y compris sans compte : c'est la porte d'entree publique
-- de l'app (/blog, reference par les moteurs de recherche).
--
-- - Un article est publie quand status = 'published' ET published_at est
--   passe : une date future le programme.
-- - content est le document de l'editeur (JSON Tiptap). L'app le rend
--   elle-meme, noeud par noeud (pas de HTML stocke : rien a assainir).
--   content_text en est le texte brut, pour le temps de lecture et la
--   recherche.
-- - Un article est ecrit dans une langue (locale) ; translation_group relie
--   ses traductions (meme valeur = meme article dans une autre langue).
-- - Toute l'equipe peut modifier un article (on se relit) ; seuls l'auteur
--   et les admins le suppriment.

DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE blog_category AS ENUM (
    'gear', 'technique', 'theory', 'learning', 'home_studio', 'band_life', 'culture', 'news'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  locale TEXT NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  translation_group UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  excerpt TEXT CHECK (char_length(excerpt) <= 300),
  cover_url TEXT,
  category blog_category NOT NULL DEFAULT 'learning',
  instruments instrument[] NOT NULL DEFAULT '{}',
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
  content_text TEXT NOT NULL DEFAULT '',
  reading_minutes INTEGER NOT NULL DEFAULT 1,
  status blog_post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  last_edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Une seule version par langue d'un meme article
  UNIQUE (translation_group, locale),
  CHECK (status = 'draft' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts (locale, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blog_posts_category_idx
  ON blog_posts (category, published_at DESC) WHERE status = 'published';

CREATE OR REPLACE FUNCTION blog_post_is_public(p blog_posts)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p.status = 'published' AND p.published_at <= NOW();
$$;

CREATE OR REPLACE FUNCTION blog_posts_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- L'auteur et la date de creation ne changent pas
    NEW.author_id := OLD.author_id;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := NOW();
  NEW.last_edited_by := COALESCE(auth.uid(), NEW.last_edited_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_before_write ON blog_posts;
CREATE TRIGGER blog_posts_before_write
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION blog_posts_before_write();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Tout le monde (anon compris) lit les articles publies ; l'equipe lit tout.
DROP POLICY IF EXISTS "Anyone reads published posts" ON blog_posts;
CREATE POLICY "Anyone reads published posts"
  ON blog_posts FOR SELECT
  USING (blog_post_is_public(blog_posts) OR is_staff());

DROP POLICY IF EXISTS "Staff write posts" ON blog_posts;
CREATE POLICY "Staff write posts"
  ON blog_posts FOR INSERT
  WITH CHECK (is_staff() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Staff edit posts" ON blog_posts;
CREATE POLICY "Staff edit posts"
  ON blog_posts FOR UPDATE
  USING (is_staff())
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Authors and admins delete posts" ON blog_posts;
CREATE POLICY "Authors and admins delete posts"
  ON blog_posts FOR DELETE
  USING ((is_staff() AND author_id = auth.uid()) OR is_staff_admin());

-- === Commentaires ===
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_comments_post_idx
  ON blog_comments (post_id, created_at);

-- Seul le texte change, et la modification se date d'elle-meme
-- (cf. activity_comments_before_update).
CREATE OR REPLACE FUNCTION blog_comments_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.post_id := OLD.post_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := NOW();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_comments_before_update ON blog_comments;
CREATE TRIGGER blog_comments_before_update
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION blog_comments_before_update();

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Les commentaires d'un article se lisent comme l'article
DROP POLICY IF EXISTS "Anyone reads comments of readable posts" ON blog_comments;
CREATE POLICY "Anyone reads comments of readable posts"
  ON blog_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM blog_posts p WHERE p.id = post_id));

-- Il faut un compte, et l'article doit etre publie
DROP POLICY IF EXISTS "Users comment published posts" ON blog_comments;
CREATE POLICY "Users comment published posts"
  ON blog_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM blog_posts p WHERE p.id = post_id AND blog_post_is_public(p))
  );

DROP POLICY IF EXISTS "Users edit own comments" ON blog_comments;
CREATE POLICY "Users edit own comments"
  ON blog_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- L'auteur du commentaire, ou l'equipe (moderation)
DROP POLICY IF EXISTS "Users and staff delete comments" ON blog_comments;
CREATE POLICY "Users and staff delete comments"
  ON blog_comments FOR DELETE
  USING (auth.uid() = user_id OR is_staff());

-- === Images du blog (couvertures et images des articles) ===
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog',
  'blog',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
CREATE POLICY "Anyone can view blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog');

-- L'equipe depose dans son dossier
DROP POLICY IF EXISTS "Staff upload blog images" ON storage.objects;
CREATE POLICY "Staff upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog'
    AND is_staff()
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Staff delete own blog images" ON storage.objects;
CREATE POLICY "Staff delete own blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog'
    AND is_staff()
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
