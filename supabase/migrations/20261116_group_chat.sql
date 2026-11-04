-- Migration: chat de groupe
--
-- Chat de jam : reserve au plan Band et efface a la fin de la jam, quelle que
-- soit la facon dont elle se termine. Le trigger est SECURITY DEFINER : aucun
-- membre n'a le droit de supprimer les messages des autres.
--
-- Chat general du groupe (band_messages sans repetition) : reserve au plan
-- Band lui aussi. Le fil d'une repetition garde ses regles.

CREATE OR REPLACE FUNCTION delete_ended_jam_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM jam_session_messages WHERE session_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delete_ended_jam_messages ON jam_sessions;
CREATE TRIGGER delete_ended_jam_messages
  AFTER UPDATE OF status ON jam_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended')
  EXECUTE FUNCTION delete_ended_jam_messages();

-- Les messages des jams deja terminees : plus aucune page ne les montre.
DELETE FROM jam_session_messages m
USING jam_sessions s
WHERE s.id = m.session_id AND s.status = 'ended';

DROP POLICY IF EXISTS "Users can view messages" ON jam_session_messages;
DROP POLICY IF EXISTS "Participants can view messages" ON jam_session_messages;
CREATE POLICY "Users can view messages"
  ON jam_session_messages FOR SELECT
  USING (
    is_jam_session_band_member(session_id, auth.uid())
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.plan = 'band')
  );

DROP POLICY IF EXISTS "Active participants can send messages" ON jam_session_messages;
CREATE POLICY "Active participants can send messages"
  ON jam_session_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_jam_session_participant(session_id, auth.uid())
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.plan = 'band')
    AND EXISTS (SELECT 1 FROM jam_sessions s WHERE s.id = session_id AND s.status <> 'ended')
  );

DROP POLICY IF EXISTS "Band members can view messages" ON band_messages;
CREATE POLICY "Band members can view messages"
  ON band_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = band_messages.band_id
      AND band_members.user_id = auth.uid()
    )
    AND (
      rehearsal_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.plan = 'band')
    )
  );

DROP POLICY IF EXISTS "Band members can send messages" ON band_messages;
CREATE POLICY "Band members can send messages"
  ON band_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = band_messages.band_id
      AND band_members.user_id = auth.uid()
    )
    AND (
      rehearsal_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.plan = 'band')
    )
  );
