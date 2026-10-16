-- Migration: plusieurs morceaux dans une session
--
-- Une session ou l'on a travaille trois morceaux s'enregistre en trois
-- lignes, une par morceau, avec chacune ses minutes et son tempo : les
-- stats par morceau (meilleur BPM, courbe, progression au tempo) restent
-- justes sans rien changer a leur lecture.
--
-- Les lignes d'une meme session partagent `session_group_id`. Les totaux
-- (nombre de sessions, serie, badges) comptent un groupe pour une session.
-- Null pour une session a un seul morceau, et pour tout l'historique.

ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS session_group_id uuid;

CREATE INDEX IF NOT EXISTS practice_sessions_group_idx
  ON practice_sessions (session_group_id)
  WHERE session_group_id IS NOT NULL;
