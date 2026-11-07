-- Migration: sondage de dates avant une repete
--
-- Un membre propose des creneaux (date, debut, fin), chacun repond oui, si
-- besoin ou non. Le createur du sondage, le titulaire ou un admin valide un
-- creneau : la repete est creee a cette date, et les reponses deviennent les
-- RSVP (oui = present, si besoin = peut-etre, non = absent).
--
-- Memes regles que les repetes : tout membre lit ; ecrire demande un groupe
-- actif (band_is_active), un groupe en lecture seule regarde.

CREATE TABLE IF NOT EXISTS rehearsal_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  location TEXT CHECK (location IS NULL OR char_length(location) <= 200),
  setlist_id UUID REFERENCES setlists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  chosen_option_id UUID,
  rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE SET NULL,
  -- La relance aux membres qui n'ont pas repondu ne part qu'une fois.
  reminded_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehearsal_polls_band_idx ON rehearsal_polls (band_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rehearsal_polls_open_idx ON rehearsal_polls (created_at) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS rehearsal_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES rehearsal_polls(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ CHECK (ends_at IS NULL OR ends_at > starts_at),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, starts_at)
);

CREATE INDEX IF NOT EXISTS rehearsal_poll_options_poll_idx ON rehearsal_poll_options (poll_id);

DO $$ BEGIN
  ALTER TABLE rehearsal_polls
    ADD CONSTRAINT rehearsal_polls_chosen_option_fkey
    FOREIGN KEY (chosen_option_id) REFERENCES rehearsal_poll_options(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rehearsal_poll_votes (
  option_id UUID NOT NULL REFERENCES rehearsal_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK (answer IN ('yes', 'maybe', 'no')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, user_id)
);

ALTER TABLE rehearsal_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_poll_votes ENABLE ROW LEVEL SECURITY;

-- === Lectures sans recursion de policies ===
CREATE OR REPLACE FUNCTION rehearsal_poll_band(p_poll_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT band_id FROM rehearsal_polls WHERE id = p_poll_id;
$$;

-- Le sondage d'un creneau, s'il est encore ouvert.
CREATE OR REPLACE FUNCTION rehearsal_poll_option_open_band(p_option_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.band_id
    FROM rehearsal_poll_options o
    JOIN rehearsal_polls p ON p.id = o.poll_id
   WHERE o.id = p_option_id AND p.status = 'open';
$$;

CREATE OR REPLACE FUNCTION rehearsal_poll_option_band(p_option_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.band_id
    FROM rehearsal_poll_options o
    JOIN rehearsal_polls p ON p.id = o.poll_id
   WHERE o.id = p_option_id;
$$;

-- === Sondages ===
DROP POLICY IF EXISTS "Band members read polls" ON rehearsal_polls;
CREATE POLICY "Band members read polls"
  ON rehearsal_polls FOR SELECT
  TO authenticated
  USING (is_band_member(band_id, auth.uid()));

DROP POLICY IF EXISTS "Band members create polls" ON rehearsal_polls;
CREATE POLICY "Band members create polls"
  ON rehearsal_polls FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_band_member(band_id, auth.uid())
    AND band_is_active(band_id)
    AND status = 'open'
    AND chosen_option_id IS NULL
    AND rehearsal_id IS NULL
    AND reminded_at IS NULL
    AND (setlist_id IS NULL OR EXISTS (
      SELECT 1 FROM setlists s WHERE s.id = setlist_id AND s.band_id = rehearsal_polls.band_id
    ))
  );

-- Valider ou supprimer : l'auteur, le titulaire ou un admin.
DROP POLICY IF EXISTS "Poll author or band admins update polls" ON rehearsal_polls;
CREATE POLICY "Poll author or band admins update polls"
  ON rehearsal_polls FOR UPDATE
  TO authenticated
  USING (
    band_is_active(band_id)
    AND (created_by = auth.uid() OR is_band_admin_or_owner(band_id, auth.uid()))
  )
  WITH CHECK (
    band_id = rehearsal_poll_band(id)
    AND band_is_active(band_id)
    AND (created_by = auth.uid() OR is_band_admin_or_owner(band_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Poll author or band admins delete polls" ON rehearsal_polls;
CREATE POLICY "Poll author or band admins delete polls"
  ON rehearsal_polls FOR DELETE
  TO authenticated
  USING (
    band_is_active(band_id)
    AND (created_by = auth.uid() OR is_band_admin_or_owner(band_id, auth.uid()))
  );

-- === Creneaux : poses par l'auteur a la creation, puis figes ===
DROP POLICY IF EXISTS "Band members read poll options" ON rehearsal_poll_options;
CREATE POLICY "Band members read poll options"
  ON rehearsal_poll_options FOR SELECT
  TO authenticated
  USING (is_band_member(rehearsal_poll_band(poll_id), auth.uid()));

DROP POLICY IF EXISTS "Poll author adds options" ON rehearsal_poll_options;
CREATE POLICY "Poll author adds options"
  ON rehearsal_poll_options FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM rehearsal_polls p
     WHERE p.id = poll_id
       AND p.created_by = auth.uid()
       AND p.status = 'open'
       AND band_is_active(p.band_id)
  ));

-- === Reponses : chacun les siennes, tant que le sondage est ouvert ===
DROP POLICY IF EXISTS "Band members read poll votes" ON rehearsal_poll_votes;
CREATE POLICY "Band members read poll votes"
  ON rehearsal_poll_votes FOR SELECT
  TO authenticated
  USING (is_band_member(rehearsal_poll_option_band(option_id), auth.uid()));

DROP POLICY IF EXISTS "Members answer for themselves" ON rehearsal_poll_votes;
CREATE POLICY "Members answer for themselves"
  ON rehearsal_poll_votes FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_band_member(rehearsal_poll_option_open_band(option_id), auth.uid())
    AND band_is_active(rehearsal_poll_option_open_band(option_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(rehearsal_poll_option_open_band(option_id), auth.uid())
    AND band_is_active(rehearsal_poll_option_open_band(option_id))
  );

-- === Creer un sondage et ses creneaux, d'un bloc ===
-- Sans SECURITY DEFINER : chaque ecriture repasse par les policies.
-- p_options : [{ "starts_at": "...", "ends_at": "..." | null }, ...]
CREATE OR REPLACE FUNCTION create_rehearsal_poll(
  p_band_id UUID,
  p_title TEXT,
  p_location TEXT,
  p_setlist_id UUID,
  p_options JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_poll UUID;
  v_count INTEGER := jsonb_array_length(COALESCE(p_options, '[]'::jsonb));
BEGIN
  IF v_count < 2 OR v_count > 8 THEN
    RAISE EXCEPTION 'poll_option_count' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_options) o
     WHERE (o->>'starts_at')::timestamptz < now() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'poll_option_past' USING ERRCODE = '22023';
  END IF;

  INSERT INTO rehearsal_polls (band_id, created_by, title, location, setlist_id)
  VALUES (p_band_id, auth.uid(), btrim(p_title), NULLIF(btrim(p_location), ''), p_setlist_id)
  RETURNING id INTO v_poll;

  INSERT INTO rehearsal_poll_options (poll_id, starts_at, ends_at, position)
  SELECT v_poll,
         (o.value->>'starts_at')::timestamptz,
         NULLIF(o.value->>'ends_at', '')::timestamptz,
         o.ordinality::integer - 1
    FROM jsonb_array_elements(p_options) WITH ORDINALITY AS o(value, ordinality);

  RETURN v_poll;
END;
$$;

-- === Valider un creneau : la repete est creee, les reponses deviennent les RSVP ===
CREATE OR REPLACE FUNCTION close_rehearsal_poll(p_poll_id UUID, p_option_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_poll rehearsal_polls%ROWTYPE;
  v_option rehearsal_poll_options%ROWTYPE;
  v_rehearsal UUID;
BEGIN
  -- FOR UPDATE ne voit que ce que la policy d'UPDATE autorise.
  SELECT * INTO v_poll FROM rehearsal_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_not_allowed' USING ERRCODE = '42501';
  END IF;
  IF v_poll.status <> 'open' THEN
    RAISE EXCEPTION 'poll_closed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_option FROM rehearsal_poll_options WHERE id = p_option_id AND poll_id = p_poll_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_option_unknown' USING ERRCODE = '22023';
  END IF;
  IF v_option.starts_at < now() THEN
    RAISE EXCEPTION 'poll_option_past' USING ERRCODE = '22023';
  END IF;

  INSERT INTO rehearsals (band_id, setlist_id, created_by, title, location, date, end_date, recurrence)
  VALUES (v_poll.band_id, v_poll.setlist_id, auth.uid(), v_poll.title, v_poll.location,
          v_option.starts_at, v_option.ends_at, 'none')
  RETURNING id INTO v_rehearsal;

  -- Les membres d'aujourd'hui ; celui qui valide vient, sauf s'il a dit non.
  INSERT INTO rehearsal_participants (rehearsal_id, user_id, status, responded_at)
  SELECT v_rehearsal,
         m.user_id,
         CASE
           WHEN v.answer = 'yes' THEN 'accepted'
           WHEN v.answer = 'maybe' THEN 'maybe'
           WHEN v.answer = 'no' THEN 'declined'
           WHEN m.user_id = auth.uid() THEN 'accepted'
           ELSE 'invited'
         END::rehearsal_rsvp_status,
         CASE WHEN v.answer IS NOT NULL THEN v.updated_at WHEN m.user_id = auth.uid() THEN now() END
    FROM band_members m
    LEFT JOIN rehearsal_poll_votes v ON v.option_id = p_option_id AND v.user_id = m.user_id
   WHERE m.band_id = v_poll.band_id;

  UPDATE rehearsal_polls
     SET status = 'closed', chosen_option_id = p_option_id, rehearsal_id = v_rehearsal, closed_at = now()
   WHERE id = p_poll_id;

  RETURN v_rehearsal;
END;
$$;

REVOKE ALL ON FUNCTION create_rehearsal_poll(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION close_rehearsal_poll(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_rehearsal_poll(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION close_rehearsal_poll(UUID, UUID) TO authenticated;
