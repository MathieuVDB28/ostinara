-- Spotify OAuth fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_connected_at TIMESTAMPTZ;

-- Audio features cache on songs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_bpm REAL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_key INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_energy REAL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_audio_fetched_at TIMESTAMPTZ;
