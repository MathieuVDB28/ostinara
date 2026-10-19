-- Migration: plusieurs morceaux preferes par album
--
-- Le coeur de la tracklist ne marquait qu'un titre (favorite_track_name /
-- favorite_track_deezer_id). On en garde maintenant une liste, dans l'ordre
-- de l'album : [{ "name": "...", "deezer_id": "..." }, ...].
--
-- Les favoris deja choisis sont repris. Les anciennes colonnes restent, en
-- lecture seule (scripts/backfill-deezer.mjs les lit encore) ; l'app ne lit
-- et n'ecrit plus que favorite_tracks.
--
-- Rejouable sans casse.

ALTER TABLE album_reviews
  ADD COLUMN IF NOT EXISTS favorite_tracks JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  ALTER TABLE album_reviews
    ADD CONSTRAINT album_reviews_favorite_tracks_array
    CHECK (jsonb_typeof(favorite_tracks) = 'array' AND jsonb_array_length(favorite_tracks) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN album_reviews.favorite_tracks IS 'Les morceaux preferes de l''album, dans l''ordre de la tracklist : [{name, deezer_id}]';
COMMENT ON COLUMN album_reviews.favorite_track_name IS 'Remplace par favorite_tracks (20261031)';
COMMENT ON COLUMN album_reviews.favorite_track_deezer_id IS 'Remplace par favorite_tracks (20261031)';

UPDATE album_reviews
SET favorite_tracks = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object('name', favorite_track_name, 'deezer_id', favorite_track_deezer_id))
)
WHERE favorite_track_name IS NOT NULL
  AND favorite_tracks = '[]'::jsonb;
