-- Migration : Enrichissement du profil utilisateur avec bio, liens sociaux et favoris
-- Date : 2024-12-30

-- ============================================================
-- 1. Ajout des nouveaux champs au profil
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- 2. Fonction et trigger pour updated_at automatique
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Index pour optimiser les recherches
-- ============================================================

CREATE INDEX IF NOT EXISTS profiles_is_private_idx ON profiles(is_private);

-- ============================================================
-- 4. Table pour les morceaux favoris (4 max par utilisateur)
-- ============================================================

CREATE TABLE IF NOT EXISTS favorite_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id),
  UNIQUE(user_id, position)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS favorite_songs_user_id_idx ON favorite_songs(user_id);
CREATE INDEX IF NOT EXISTS favorite_songs_position_idx ON favorite_songs(user_id, position);

-- ============================================================
-- 5. RLS pour favorite_songs
-- ============================================================

ALTER TABLE favorite_songs ENABLE ROW LEVEL SECURITY;

-- Politique : l'utilisateur peut gérer ses propres favoris
CREATE POLICY "Users can manage own favorite songs"
  ON favorite_songs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique : voir les favoris selon la visibilité du profil
CREATE POLICY "Users can view favorite songs based on privacy"
  ON favorite_songs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = favorite_songs.user_id
      AND (
        -- Profil public
        profiles.is_private = false
        -- Ou c'est l'utilisateur lui-même
        OR auth.uid() = favorite_songs.user_id
        -- Ou ils sont amis
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = favorite_songs.user_id)
            OR (addressee_id = auth.uid() AND requester_id = favorite_songs.user_id)
          )
        )
      )
    )
  );

-- ============================================================
-- 6. Table pour les albums favoris (4 max par utilisateur)
-- ============================================================

CREATE TABLE IF NOT EXISTS favorite_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_url TEXT,
  spotify_id TEXT,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, position)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS favorite_albums_user_id_idx ON favorite_albums(user_id);
CREATE INDEX IF NOT EXISTS favorite_albums_position_idx ON favorite_albums(user_id, position);

-- ============================================================
-- 7. RLS pour favorite_albums
-- ============================================================

ALTER TABLE favorite_albums ENABLE ROW LEVEL SECURITY;

-- Politique : l'utilisateur peut gérer ses propres albums favoris
CREATE POLICY "Users can manage own favorite albums"
  ON favorite_albums
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique : voir les albums favoris selon la visibilité du profil
CREATE POLICY "Users can view favorite albums based on privacy"
  ON favorite_albums
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = favorite_albums.user_id
      AND (
        -- Profil public
        profiles.is_private = false
        -- Ou c'est l'utilisateur lui-même
        OR auth.uid() = favorite_albums.user_id
        -- Ou ils sont amis
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = favorite_albums.user_id)
            OR (addressee_id = auth.uid() AND requester_id = favorite_albums.user_id)
          )
        )
      )
    )
  );
