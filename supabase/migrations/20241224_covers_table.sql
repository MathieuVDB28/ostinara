-- Types enum pour les covers
CREATE TYPE cover_visibility AS ENUM ('private', 'friends', 'public');
CREATE TYPE cover_media_type AS ENUM ('video', 'audio');

-- Table covers
CREATE TABLE IF NOT EXISTS covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

  -- Infos média
  media_url TEXT NOT NULL,
  media_type cover_media_type NOT NULL DEFAULT 'video',
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,

  -- Métadonnées
  visibility cover_visibility NOT NULL DEFAULT 'friends',
  description TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS covers_user_id_idx ON covers(user_id);
CREATE INDEX IF NOT EXISTS covers_song_id_idx ON covers(song_id);
CREATE INDEX IF NOT EXISTS covers_visibility_idx ON covers(visibility);
CREATE INDEX IF NOT EXISTS covers_created_at_idx ON covers(created_at DESC);

-- Activer RLS
ALTER TABLE covers ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs voient leurs propres covers
CREATE POLICY "Users can view own covers"
  ON covers FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : tout le monde peut voir les covers publics
CREATE POLICY "Anyone can view public covers"
  ON covers FOR SELECT
  USING (visibility = 'public');

-- Politique : les utilisateurs peuvent insérer leurs covers
CREATE POLICY "Users can insert own covers"
  ON covers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent modifier leurs covers
CREATE POLICY "Users can update own covers"
  ON covers FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs covers
CREATE POLICY "Users can delete own covers"
  ON covers FOR DELETE
  USING (auth.uid() = user_id);
