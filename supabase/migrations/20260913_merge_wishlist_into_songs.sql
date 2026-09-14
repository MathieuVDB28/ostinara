-- Migration: fusion de la wishlist morceaux dans songs
--
-- L'app avait deux facons de dire "je veux apprendre ce morceau" :
--   * la table wishlist_songs
--   * songs.status = 'want_to_learn'
-- Deux endroits ou chercher, deux endroits ou ajouter. On garde le statut.
--
-- La table wishlist_songs n'est pas supprimee ici : la migration est
-- rejouable et reversible tant que les lignes restent. Un DROP pourra
-- suivre une fois la version en production.

-- 1. Reprendre chaque entree de wishlist absente de la bibliotheque.
--    Le dedoublonnage se fait sur spotify_id quand il existe, sinon sur
--    le couple titre/artiste insensible a la casse.
INSERT INTO songs (
  user_id, title, artist, album, cover_url, spotify_id, preview_url,
  status, created_at, updated_at
)
SELECT
  w.user_id, w.title, w.artist, w.album, w.cover_url, w.spotify_id,
  w.preview_url, 'want_to_learn'::song_status, w.created_at, NOW()
FROM wishlist_songs w
WHERE NOT EXISTS (
  SELECT 1
  FROM songs s
  WHERE s.user_id = w.user_id
    AND (
      (w.spotify_id IS NOT NULL AND s.spotify_id = w.spotify_id)
      OR (
        lower(s.title) = lower(w.title)
        AND lower(s.artist) = lower(w.artist)
      )
    )
);

-- 2. Vider les lignes desormais representees dans songs.
DELETE FROM wishlist_songs w
WHERE EXISTS (
  SELECT 1
  FROM songs s
  WHERE s.user_id = w.user_id
    AND (
      (w.spotify_id IS NOT NULL AND s.spotify_id = w.spotify_id)
      OR (
        lower(s.title) = lower(w.title)
        AND lower(s.artist) = lower(w.artist)
      )
    )
);
