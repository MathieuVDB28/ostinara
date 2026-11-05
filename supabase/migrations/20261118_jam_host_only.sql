-- Migration: seul l'hote pilote sa jam
--
-- Tout membre d'un groupe pouvait modifier ou terminer la jam depuis le
-- navigateur : seule la page la lui fermait. Les jams oubliees sont fermees
-- par le cron practice-reminders, avec le service role.

DROP POLICY IF EXISTS "Band members can update jam session" ON jam_sessions;
DROP POLICY IF EXISTS "Users can update jam sessions" ON jam_sessions;

CREATE POLICY "Users can update jam sessions"
  ON jam_sessions FOR UPDATE
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());
