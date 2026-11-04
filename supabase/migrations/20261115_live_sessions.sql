-- Migration: sessions en direct
--
-- Quand un musicien lance son chrono, ses amis sont prevenus une minute plus
-- tard et peuvent suivre la session. Pro et Band la suivent en direct (chrono,
-- morceau, tempo) et discutent ; Free ne voit qu'un instantane, servi par le
-- serveur : il n'a aucun droit de lecture ici, ni donc de canal Realtime.
--
-- `live_sessions` : une ligne par musicien, ecrite par le serveur seulement
-- (service role). Terminer met `ended_at` plutot que de supprimer : ceux qui
-- regardent recoivent l'UPDATE (Realtime n'envoie pas de DELETE filtrable) et
-- la notification de fin lit `announced_at`. La ligne part au lancement
-- suivant, ou au passage du cron pour celles qui trainent.
--
-- `live_session_messages` : le chat, efface a la fin de la session. Les droits
-- suivent le plan de chacun : un musicien Free ne lit pas le chat de sa propre
-- session, ses amis Pro/Band y discutent entre eux.

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  -- NULL pour qui joue de plusieurs instruments : il ne le dit qu'a la fin.
  instrument instrument,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Le chrono : `accumulated_ms` a l'instant `segment_started_at`, et il
  -- avance tant que la session n'est pas en pause.
  accumulated_ms BIGINT NOT NULL DEFAULT 0,
  segment_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  song_title TEXT,
  song_artist TEXT,
  song_cover_url TEXT,
  exercise_name TEXT,
  bpm INTEGER,
  announced_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live session readable by host and paid friends" ON live_sessions;
CREATE POLICY "Live session readable by host and paid friends"
  ON live_sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.plan IN ('pro', 'band')
      )
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = live_sessions.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = live_sessions.user_id)
          )
      )
    )
  );

CREATE TABLE IF NOT EXISTS live_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_session_messages_session_idx
  ON live_session_messages (session_id, created_at);

ALTER TABLE live_session_messages ENABLE ROW LEVEL SECURITY;

-- La lecture de live_sessions, soumise a sa RLS, verifie deja l'amitie.
DROP POLICY IF EXISTS "Live chat readable by paid participants" ON live_session_messages;
CREATE POLICY "Live chat readable by paid participants"
  ON live_session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.plan IN ('pro', 'band')
    )
    AND EXISTS (
      SELECT 1 FROM live_sessions s
      WHERE s.id = live_session_messages.session_id AND s.ended_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Live chat writable by paid participants" ON live_session_messages;
CREATE POLICY "Live chat writable by paid participants"
  ON live_session_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.plan IN ('pro', 'band')
    )
    AND EXISTS (
      SELECT 1 FROM live_sessions s
      WHERE s.id = live_session_messages.session_id AND s.ended_at IS NULL
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE live_session_messages;

-- Cote reception : on peut ne plus etre prevenu quand un ami se met a jouer,
-- sans perdre le reste.
ALTER TABLE profile_private
  ADD COLUMN IF NOT EXISTS notify_friends_playing BOOLEAN NOT NULL DEFAULT true;
