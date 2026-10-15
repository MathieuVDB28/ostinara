-- =============================================================================
-- Migration : morceau prefere d'un album, rappels de pratique
-- Date : 2026-10-15
--
--   1. album_reviews.favorite_track_* — le morceau prefere, choisi apres
--      l'ecoute, qu'on peut ensuite ajouter a sa bibliotheque
--   2. profiles.practice_reminders    — couper les rappels de pratique sans
--      couper les notifications d'amis
--   3. index de notification_logs     — le cron des rappels y lit ce qui a
--      deja ete envoye (un rappel par jour, pas deux fois le meme morceau)
--
-- Rejouable sans casse.
-- =============================================================================


-- 1. Morceau prefere d'un album ----------------------------------------------

ALTER TABLE album_reviews
  ADD COLUMN IF NOT EXISTS favorite_track_name TEXT,
  ADD COLUMN IF NOT EXISTS favorite_track_spotify_id TEXT;

COMMENT ON COLUMN album_reviews.favorite_track_name IS 'Le morceau prefere de l''album, choisi apres l''ecoute';


-- 2. Rappels de pratique -----------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS practice_reminders BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.practice_reminders IS 'Rappels de pratique (morceau delaisse, pause, serie, plan de la semaine)';


-- 3. Lecture des rappels deja envoyes ------------------------------------------

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent
  ON notification_logs(user_id, sent_at DESC);
