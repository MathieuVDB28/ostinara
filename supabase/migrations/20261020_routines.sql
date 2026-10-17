-- Migration: les routines
--
-- Une routine est une session de travail reutilisable : une liste ordonnee
-- de morceaux ET d'exercices, orientee pratique (progression, tempo). C'est
-- le pendant perso de la setlist, qui elle reste orientee scene (concert,
-- groupe, export PDF, jam). On monte une routine dans « Jouer › Session »
-- et on la relance depuis le Carnet.
--
-- On reutilise l'enum setlist_item_type (song | section | exercise) : une
-- routine n'utilise que song et exercise. Un item garde un snapshot
-- (titre, nom) pour survivre a la suppression de la source.

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  item_type setlist_item_type NOT NULL,
  -- Morceau (snapshot + lien eventuel vers la biblio)
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  song_title TEXT,
  song_artist TEXT,
  song_cover_url TEXT,
  -- Exercice (lien biblio, ou juste un nom pour un exo express)
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name TEXT,
  exercise_category exercise_category,
  -- Commun
  bpm INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS routines_user_idx ON routines(user_id);
CREATE INDEX IF NOT EXISTS routine_items_routine_idx ON routine_items(routine_id);
CREATE INDEX IF NOT EXISTS routine_items_position_idx ON routine_items(routine_id, position);

-- updated_at : on reutilise la fonction trigger existante.
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS : chacun ne voit et ne gere que ses propres routines.
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own routines"
  ON routines FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage their own routine items"
  ON routine_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
    )
  );
