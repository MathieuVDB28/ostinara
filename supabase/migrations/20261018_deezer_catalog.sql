-- Migration: le catalogue musical passe de Spotify a Deezer
--
-- Depuis 2026, une app Spotify en mode developpement exige un compte
-- Premium chez son proprietaire et plafonne a 5 utilisateurs ; le quota
-- etendu est reserve aux services de plus de 250 000 utilisateurs actifs.
-- Le catalogue (recherche, albums, artistes, pochettes) vient desormais de
-- l'API publique de Deezer, sans compte ni cle.
--
-- Les colonnes `spotify_id` restent, en lecture seule : elles permettent de
-- rediriger les anciens liens /albums/<id Spotify> et de retrouver l'album
-- Deezer equivalent (scripts/backfill-deezer.mjs).

ALTER TABLE songs            ADD COLUMN IF NOT EXISTS deezer_id text;
ALTER TABLE album_reviews    ADD COLUMN IF NOT EXISTS deezer_id text;
ALTER TABLE album_reviews    ADD COLUMN IF NOT EXISTS favorite_track_deezer_id text;
ALTER TABLE album_wishlist   ADD COLUMN IF NOT EXISTS deezer_id text;
ALTER TABLE favorite_albums  ADD COLUMN IF NOT EXISTS deezer_id text;

CREATE INDEX IF NOT EXISTS songs_deezer_id_idx         ON songs (deezer_id);
CREATE INDEX IF NOT EXISTS album_reviews_deezer_id_idx ON album_reviews (deezer_id);
CREATE INDEX IF NOT EXISTS album_wishlist_deezer_id_idx ON album_wishlist (deezer_id);

-- Un album n'est qu'une fois dans « À écouter », comme avec Spotify.
DO $$ BEGIN
  ALTER TABLE album_wishlist
    ADD CONSTRAINT album_wishlist_user_deezer_unique UNIQUE (user_id, deezer_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- La connexion de compte Spotify disparait : ses jetons n'ont plus de
-- raison d'etre conserves.
ALTER TABLE profiles DROP COLUMN IF EXISTS spotify_access_token;
ALTER TABLE profiles DROP COLUMN IF EXISTS spotify_refresh_token;
ALTER TABLE profiles DROP COLUMN IF EXISTS spotify_token_expires_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS spotify_user_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS spotify_connected_at;
