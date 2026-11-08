-- Migration: fonctions Pro, objectifs de tempo dates et prises privees
--
-- 1. Objectif « tel tempo a telle date », par morceau et par instrument :
--    song_parts.goal_bpm + goal_date. Un rappel part 7 jours avant si le
--    tempo n'est pas atteint (cron practice-reminders, goal_reminded_at).
--
-- 2. Prises privees : un enregistrement audio ou video d'un morceau de sa
--    biblio, visible par soi seul, pour comparer ses progres dans le temps
--    (avec ses covers). Fichiers dans le bucket prive `covers`, au chemin
--    <moi>/takes/<morceau>/<fichier> : ils comptent dans les 20 Go de covers
--    (cover_storage_used lit tout le dossier de la personne). En ajouter est
--    reserve a Pro et Band ; on garde la lecture et la suppression apres.
--
-- Le bucket `covers` accepte aussi l'audio des telephones (m4a, aac, ogg).

-- === 1. Objectifs de tempo ===
ALTER TABLE song_parts
  ADD COLUMN IF NOT EXISTS goal_bpm INTEGER,
  ADD COLUMN IF NOT EXISTS goal_date DATE,
  ADD COLUMN IF NOT EXISTS goal_reminded_at TIMESTAMPTZ;

ALTER TABLE song_parts DROP CONSTRAINT IF EXISTS song_parts_goal_bpm_range;
ALTER TABLE song_parts ADD CONSTRAINT song_parts_goal_bpm_range CHECK (goal_bpm IS NULL OR goal_bpm BETWEEN 20 AND 300);
ALTER TABLE song_parts DROP CONSTRAINT IF EXISTS song_parts_goal_complete;
ALTER TABLE song_parts ADD CONSTRAINT song_parts_goal_complete CHECK ((goal_bpm IS NULL) = (goal_date IS NULL));

CREATE INDEX IF NOT EXISTS song_parts_goal_date_idx ON song_parts (goal_date) WHERE goal_date IS NOT NULL;

-- Un objectif change : le rappel pourra repartir.
CREATE OR REPLACE FUNCTION reset_song_part_goal_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.goal_bpm IS DISTINCT FROM OLD.goal_bpm OR NEW.goal_date IS DISTINCT FROM OLD.goal_date THEN
    NEW.goal_reminded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_song_part_goal_reminder ON song_parts;
CREATE TRIGGER reset_song_part_goal_reminder
  BEFORE UPDATE OF goal_bpm, goal_date ON song_parts
  FOR EACH ROW EXECUTE FUNCTION reset_song_part_goal_reminder();

-- === 2. Prises privees ===
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY(
         SELECT DISTINCT unnest(
           COALESCE(allowed_mime_types, '{}')
           || ARRAY['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg']
         )
       )
 WHERE id = 'covers';

CREATE TABLE IF NOT EXISTS song_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  instrument instrument,
  title TEXT CHECK (char_length(title) <= 120),
  note TEXT CHECK (char_length(note) <= 1000),
  -- Chemin dans le bucket covers : <moi>/takes/<morceau>/<fichier>.
  media_path TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  mime_type TEXT CHECK (char_length(mime_type) <= 100),
  duration_seconds NUMERIC(9, 2) CHECK (duration_seconds >= 0),
  file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS song_takes_song_idx ON song_takes (song_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS song_takes_user_idx ON song_takes (user_id);

-- Son morceau, son dossier, ses 20 Go ; ni la personne, ni le fichier ne changent.
CREATE OR REPLACE FUNCTION check_song_take()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.song_id := OLD.song_id;
    NEW.media_path := OLD.media_path;
    NEW.media_type := OLD.media_type;
    NEW.mime_type := OLD.mime_type;
    NEW.file_size_bytes := OLD.file_size_bytes;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
  IF NOT EXISTS (SELECT 1 FROM songs WHERE id = NEW.song_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Morceau introuvable dans ta biblio' USING ERRCODE = '42501';
  END IF;
  IF NEW.media_path NOT LIKE NEW.user_id::TEXT || '/takes/%' THEN
    RAISE EXCEPTION 'Le fichier doit etre dans ton dossier' USING ERRCODE = '42501';
  END IF;
  -- Le fichier est deja envoye : on tolere ce seul depassement, comme une cover.
  IF cover_storage_used(NEW.user_id) - COALESCE(NEW.file_size_bytes, 0) >= 21474836480 THEN
    RAISE EXCEPTION 'Stockage des covers plein' USING ERRCODE = '53100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_song_take ON song_takes;
CREATE TRIGGER check_song_take
  BEFORE INSERT OR UPDATE ON song_takes
  FOR EACH ROW EXECUTE FUNCTION check_song_take();

-- Le plan de la personne, lu hors RLS (profiles.plan reste la seule source).
CREATE OR REPLACE FUNCTION has_paid_plan(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT plan IN ('pro', 'band') FROM profiles WHERE id = p_user_id), false);
$$;

REVOKE ALL ON FUNCTION has_paid_plan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_paid_plan(UUID) TO authenticated;

ALTER TABLE song_takes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their takes" ON song_takes;
CREATE POLICY "Users read their takes"
  ON song_takes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Paid users add takes" ON song_takes;
CREATE POLICY "Paid users add takes"
  ON song_takes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Users edit their takes" ON song_takes;
CREATE POLICY "Users edit their takes"
  ON song_takes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete their takes" ON song_takes;
CREATE POLICY "Users delete their takes"
  ON song_takes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
