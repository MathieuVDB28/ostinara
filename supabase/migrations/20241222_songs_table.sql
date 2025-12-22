-- Types enum pour les morceaux
CREATE TYPE song_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE song_status AS ENUM ('want_to_learn', 'learning', 'mastered');

-- Table songs
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Infos de base
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,

  -- Infos Spotify (pour référence)
  spotify_id TEXT,
  preview_url TEXT,

  -- Infos guitare
  difficulty song_difficulty,
  status song_status DEFAULT 'want_to_learn',
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  tuning TEXT DEFAULT 'Standard',
  capo_position INTEGER DEFAULT 0 CHECK (capo_position >= 0 AND capo_position <= 12),

  -- Liens et notes
  tabs_url TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS songs_user_id_idx ON songs(user_id);
CREATE INDEX IF NOT EXISTS songs_status_idx ON songs(status);
CREATE INDEX IF NOT EXISTS songs_spotify_id_idx ON songs(spotify_id);

-- Activer RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Politiques : les utilisateurs ne voient que leurs propres morceaux
CREATE POLICY "Users can view own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
