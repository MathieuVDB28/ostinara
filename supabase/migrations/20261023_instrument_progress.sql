-- Migration: la progression par instrument
--
-- Un meme morceau se travaille a la basse et a la guitare : un seul morceau
-- dans la biblio, mais un statut et une progression par instrument.
--
-- `song_parts` porte ces statuts. `songs.status` et `songs.progress_percent`
-- restent (badges, defis, profil public, plan de la semaine, tris…) mais
-- deviennent la synthese des parties, tenue a jour par trigger : le
-- meilleur statut et la meilleure progression, tous instruments confondus.
-- « Maitrise » sur la biblio veut donc dire « maitrise sur au moins un
-- instrument ».
--
-- L'accordage, le tempo cible et la tab restent sur le morceau : un drop D
-- s'applique a la guitare comme a la basse, et le tempo est celui du
-- morceau.

-- === Les parties ===
CREATE TABLE IF NOT EXISTS song_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instrument instrument NOT NULL,
  status song_status NOT NULL DEFAULT 'want_to_learn',
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (song_id, instrument)
);

CREATE INDEX IF NOT EXISTS song_parts_user_idx ON song_parts (user_id);

ALTER TABLE song_parts ENABLE ROW LEVEL SECURITY;

-- Visible par qui voit le morceau : la sous-requete passe par la RLS de songs.
DROP POLICY IF EXISTS "Song parts follow song visibility" ON song_parts;
CREATE POLICY "Song parts follow song visibility"
  ON song_parts FOR SELECT
  USING (EXISTS (SELECT 1 FROM songs s WHERE s.id = song_parts.song_id));

DROP POLICY IF EXISTS "Users manage own song parts" ON song_parts;
CREATE POLICY "Users manage own song parts"
  ON song_parts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM songs s WHERE s.id = song_parts.song_id AND s.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_song_parts_updated_at ON song_parts;
CREATE TRIGGER update_song_parts_updated_at
  BEFORE UPDATE ON song_parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- === L'instrument principal d'un musicien (guitare a defaut) ===
CREATE OR REPLACE FUNCTION primary_instrument(p_user UUID)
RETURNS instrument
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT instrument FROM profile_instruments WHERE user_id = p_user AND is_primary LIMIT 1),
    'guitar'::instrument
  );
$$;

-- === Synthese des parties sur le morceau ===
CREATE OR REPLACE FUNCTION sync_song_from_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_song UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.song_id ELSE NEW.song_id END;
  v_status song_status;
  v_progress INTEGER;
BEGIN
  -- L'ordre de l'enum est celui de la progression : want_to_learn < learning < mastered.
  SELECT max(status), max(progress_percent)
    INTO v_status, v_progress
    FROM song_parts
   WHERE song_id = v_song;

  -- Plus aucune partie : le morceau garde ses dernieres valeurs.
  IF v_status IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE songs
     SET status = v_status, progress_percent = v_progress
   WHERE id = v_song
     AND (status IS DISTINCT FROM v_status OR progress_percent IS DISTINCT FROM v_progress);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS song_parts_sync_song ON song_parts;
CREATE TRIGGER song_parts_sync_song
  AFTER INSERT OR UPDATE OR DELETE ON song_parts
  FOR EACH ROW EXECUTE FUNCTION sync_song_from_parts();

-- === Un morceau ajoute naît avec la partie de l'instrument principal ===
-- Quel que soit le chemin d'ajout (fiche, album, ami, defi, hors ligne).
CREATE OR REPLACE FUNCTION create_primary_song_part()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO song_parts (song_id, user_id, instrument, status, progress_percent)
  VALUES (NEW.id, NEW.user_id, primary_instrument(NEW.user_id), NEW.status, COALESCE(NEW.progress_percent, 0))
  ON CONFLICT (song_id, instrument) DO NOTHING;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS songs_create_primary_part ON songs;
CREATE TRIGGER songs_create_primary_part
  AFTER INSERT ON songs
  FOR EACH ROW EXECUTE FUNCTION create_primary_song_part();

-- Les morceaux existants : une partie sur l'instrument principal du
-- proprietaire, avec le statut et la progression actuels.
INSERT INTO song_parts (song_id, user_id, instrument, status, progress_percent)
SELECT s.id, s.user_id, primary_instrument(s.user_id), s.status, COALESCE(s.progress_percent, 0)
  FROM songs s
ON CONFLICT (song_id, instrument) DO NOTHING;

-- === L'instrument d'une session de pratique ===
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS instrument instrument;

UPDATE practice_sessions ps
   SET instrument = primary_instrument(ps.user_id)
 WHERE ps.instrument IS NULL;

CREATE INDEX IF NOT EXISTS practice_sessions_song_instrument_idx
  ON practice_sessions (song_id, instrument);

-- === Les instruments d'un exercice ===
-- Liste vide : l'exercice vaut pour tous (mise en place, oreille…).
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instruments instrument[] NOT NULL DEFAULT '{}';

-- Tout ce qui existe a ete ecrit par et pour des guitaristes.
UPDATE exercises SET instruments = '{guitar}' WHERE instruments = '{}';

CREATE INDEX IF NOT EXISTS exercises_instruments_idx ON exercises USING GIN (instruments);

-- === Les categories des autres instruments ===
-- Une valeur ajoutee a un enum n'est utilisable qu'apres le commit : les
-- exercices qui s'en servent arrivent dans la migration suivante.
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'rudiments';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'grooves';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'fills';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'independence';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'slap';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'walking_bass';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'voicings';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'reading';
