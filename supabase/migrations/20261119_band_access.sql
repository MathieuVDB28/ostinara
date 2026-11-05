-- Migration: le groupe vit avec le plan Band de son titulaire
--
-- 1. Tout le groupe a la jam, le chat, les repetes, les setlists et la fiche
--    technique tant que son titulaire a le plan Band. Le plan de chaque membre
--    ne compte plus pour les outils du groupe.
-- 2. Le titulaire quitte le plan Band : 30 jours de grace, puis lecture seule.
--    Le groupe redevient actif s'il se reabonne ou s'il le transfere a un
--    membre qui a le plan Band.
-- 3. 6 membres au plus par groupe : le titulaire et 5 invites. Les groupes deja
--    plus grands gardent leurs membres mais n'en accueillent plus.
-- 4. Le plan Band offre 5 places au lieu de 2. Un abonne Pro peut accepter une
--    place : son abonnement s'arrete a la fin de sa periode.

ALTER TABLE bands ADD COLUMN IF NOT EXISTS plan_lapsed_at TIMESTAMPTZ;

-- Les groupes deja sans plan Band commencent leur grace aujourd'hui.
UPDATE bands b
   SET plan_lapsed_at = now()
  FROM profiles p
 WHERE p.id = b.owner_id AND p.plan <> 'band' AND b.plan_lapsed_at IS NULL;

CREATE OR REPLACE FUNCTION band_is_active(p_band_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM bands b
      JOIN profiles p ON p.id = b.owner_id
     WHERE b.id = p_band_id
       AND (p.plan = 'band' OR b.plan_lapsed_at > now() - INTERVAL '30 days')
  );
$$;

CREATE OR REPLACE FUNCTION can_write_setlist(p_setlist_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM setlists s
     WHERE s.id = p_setlist_id
       AND (
         (s.band_id IS NULL AND s.user_id = auth.uid())
         OR (s.band_id IS NOT NULL AND is_band_member(s.band_id, auth.uid()) AND band_is_active(s.band_id))
       )
  );
$$;

CREATE OR REPLACE FUNCTION rehearsal_band_is_active(p_rehearsal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rehearsals r
     WHERE r.id = p_rehearsal_id AND band_is_active(r.band_id)
  );
$$;

-- Une jam de groupe dont le groupe est actif.
CREATE OR REPLACE FUNCTION jam_session_band_is_active(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jam_sessions s
     WHERE s.id = p_session_id AND s.band_id IS NOT NULL AND band_is_active(s.band_id)
  );
$$;

-- === Date de fin du plan : tenue par la base, jamais par le navigateur ===
CREATE OR REPLACE FUNCTION sync_band_plan_lapse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'band' THEN
    UPDATE bands SET plan_lapsed_at = NULL WHERE owner_id = NEW.id;
  ELSE
    UPDATE bands SET plan_lapsed_at = now() WHERE owner_id = NEW.id AND plan_lapsed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_band_plan_lapse ON profiles;
CREATE TRIGGER sync_band_plan_lapse
  AFTER UPDATE OF plan ON profiles
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan AND (OLD.plan = 'band' OR NEW.plan = 'band'))
  EXECUTE FUNCTION sync_band_plan_lapse();

-- Le titulaire garde le droit de modifier son groupe, pas d'en sortir le plan.
CREATE OR REPLACE FUNCTION protect_band_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.plan_lapsed_at IS DISTINCT FROM OLD.plan_lapsed_at THEN
    RAISE EXCEPTION 'Ces champs ne se modifient pas directement' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_band_columns ON bands;
CREATE TRIGGER protect_band_columns
  BEFORE UPDATE ON bands
  FOR EACH ROW EXECUTE FUNCTION protect_band_columns();

-- === 6 membres au plus, et personne de plus dans un groupe fige ===
CREATE OR REPLACE FUNCTION check_band_member_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Le titulaire qui cree son groupe.
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('band_members:' || NEW.band_id::text));

  IF NOT band_is_active(NEW.band_id) THEN
    RAISE EXCEPTION 'Ce groupe est en lecture seule' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM band_members WHERE band_id = NEW.band_id) >= 6 THEN
    RAISE EXCEPTION 'Ce groupe est complet' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_member_insert ON band_members;
CREATE TRIGGER check_band_member_insert
  BEFORE INSERT ON band_members
  FOR EACH ROW EXECUTE FUNCTION check_band_member_insert();

CREATE OR REPLACE FUNCTION check_band_invitation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('band_members:' || NEW.band_id::text));

  -- Les invitations en attente reservent une place : une fois acceptees, elles
  -- entrent toutes.
  IF (SELECT count(*) FROM band_members WHERE band_id = NEW.band_id)
     + (SELECT count(*) FROM band_invitations WHERE band_id = NEW.band_id AND status = 'pending') >= 6 THEN
    RAISE EXCEPTION 'Ce groupe est complet' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_invitation_insert ON band_invitations;
CREATE TRIGGER check_band_invitation_insert
  BEFORE INSERT ON band_invitations
  FOR EACH ROW EXECUTE FUNCTION check_band_invitation_insert();

-- === Transfert du groupe ===
CREATE OR REPLACE FUNCTION transfer_band_ownership(p_band_id UUID, p_new_owner UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bands WHERE id = p_band_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Seul le titulaire transfere son groupe' USING ERRCODE = '42501';
  END IF;
  IF NOT is_band_member(p_band_id, p_new_owner) THEN
    RAISE EXCEPTION 'Membre introuvable' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_new_owner AND plan = 'band') THEN
    RAISE EXCEPTION 'Le nouveau titulaire doit avoir le plan Band' USING ERRCODE = '42501';
  END IF;

  UPDATE bands SET owner_id = p_new_owner, plan_lapsed_at = NULL WHERE id = p_band_id;
  UPDATE band_members SET role = 'admin' WHERE band_id = p_band_id AND user_id = auth.uid();
  UPDATE band_members SET role = 'owner' WHERE band_id = p_band_id AND user_id = p_new_owner;
END;
$$;

REVOKE ALL ON FUNCTION transfer_band_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_band_ownership(UUID, UUID) TO authenticated;

-- === Invitations : titulaire et admins, dans un groupe actif ===
DROP POLICY IF EXISTS "Band members can send invitations" ON band_invitations;
CREATE POLICY "Band members can send invitations"
  ON band_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND is_band_admin_or_owner(band_id, auth.uid())
    AND band_is_active(band_id)
  );

-- === Setlists ===
DROP POLICY IF EXISTS "Users can create personal setlists or band setlists" ON setlists;
CREATE POLICY "Users can create personal setlists or band setlists"
  ON setlists FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      band_id IS NULL
      OR (is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
    )
  );

DROP POLICY IF EXISTS "Users can update own or band setlists" ON setlists;
CREATE POLICY "Users can update own or band setlists"
  ON setlists FOR UPDATE
  USING (
    (band_id IS NULL AND user_id = auth.uid())
    OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
  );

DROP POLICY IF EXISTS "Users can delete own or band setlists" ON setlists;
CREATE POLICY "Users can delete own or band setlists"
  ON setlists FOR DELETE
  USING (
    (band_id IS NULL AND user_id = auth.uid())
    OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
  );

DROP POLICY IF EXISTS "Users can insert items in accessible setlists" ON setlist_items;
CREATE POLICY "Users can insert items in accessible setlists"
  ON setlist_items FOR INSERT
  WITH CHECK (can_write_setlist(setlist_id));

DROP POLICY IF EXISTS "Users can update items in accessible setlists" ON setlist_items;
CREATE POLICY "Users can update items in accessible setlists"
  ON setlist_items FOR UPDATE
  USING (can_write_setlist(setlist_id));

DROP POLICY IF EXISTS "Users can delete items in accessible setlists" ON setlist_items;
CREATE POLICY "Users can delete items in accessible setlists"
  ON setlist_items FOR DELETE
  USING (can_write_setlist(setlist_id));

-- === Repetes ===
DROP POLICY IF EXISTS "Band members can create rehearsals" ON rehearsals;
CREATE POLICY "Band members can create rehearsals"
  ON rehearsals FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND is_band_member(band_id, auth.uid())
    AND band_is_active(band_id)
  );

DROP POLICY IF EXISTS "Band members can update rehearsals" ON rehearsals;
CREATE POLICY "Band members can update rehearsals"
  ON rehearsals FOR UPDATE
  USING (is_band_member(band_id, auth.uid()) AND band_is_active(band_id));

DROP POLICY IF EXISTS "Creator or band owner can delete rehearsals" ON rehearsals;
CREATE POLICY "Creator or band owner can delete rehearsals"
  ON rehearsals FOR DELETE
  USING (
    band_is_active(band_id)
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM bands WHERE bands.id = rehearsals.band_id AND bands.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Band members can add participants" ON rehearsal_participants;
CREATE POLICY "Band members can add participants"
  ON rehearsal_participants FOR INSERT
  WITH CHECK (is_rehearsal_band_member(rehearsal_id, auth.uid()) AND rehearsal_band_is_active(rehearsal_id));

DROP POLICY IF EXISTS "Participant can update own RSVP" ON rehearsal_participants;
CREATE POLICY "Participant can update own RSVP"
  ON rehearsal_participants FOR UPDATE
  USING (user_id = auth.uid() AND rehearsal_band_is_active(rehearsal_id));

DROP POLICY IF EXISTS "Creator or band owner can remove participants" ON rehearsal_participants;
CREATE POLICY "Creator or band owner can remove participants"
  ON rehearsal_participants FOR DELETE
  USING (
    (user_id = auth.uid() OR is_rehearsal_band_member(rehearsal_id, auth.uid()))
    AND rehearsal_band_is_active(rehearsal_id)
  );

-- === Chat du groupe : le fil d'une repete reste lisible, le chat general se ferme ===
DROP POLICY IF EXISTS "Band members can view messages" ON band_messages;
CREATE POLICY "Band members can view messages"
  ON band_messages FOR SELECT
  USING (
    is_band_member(band_id, auth.uid())
    AND (rehearsal_id IS NOT NULL OR band_is_active(band_id))
  );

DROP POLICY IF EXISTS "Band members can send messages" ON band_messages;
CREATE POLICY "Band members can send messages"
  ON band_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(band_id, auth.uid())
    AND band_is_active(band_id)
  );

-- === Fiche technique ===
DROP POLICY IF EXISTS "Band owner/admin can insert tech riders" ON tech_riders;
CREATE POLICY "Band owner/admin can insert tech riders"
  ON tech_riders FOR INSERT
  WITH CHECK (is_band_admin_or_owner(band_id, auth.uid()) AND band_is_active(band_id));

DROP POLICY IF EXISTS "Band owner/admin can update tech riders" ON tech_riders;
CREATE POLICY "Band owner/admin can update tech riders"
  ON tech_riders FOR UPDATE
  USING (is_band_admin_or_owner(band_id, auth.uid()) AND band_is_active(band_id));

DROP POLICY IF EXISTS "Band owner can delete tech riders" ON tech_riders;
CREATE POLICY "Band owner can delete tech riders"
  ON tech_riders FOR DELETE
  USING (
    band_is_active(band_id)
    AND EXISTS (SELECT 1 FROM bands WHERE bands.id = tech_riders.band_id AND bands.owner_id = auth.uid())
  );

-- === Jam : le groupe ouvre, plus le plan de chacun ===
DROP POLICY IF EXISTS "Users can create jam sessions" ON jam_sessions;
CREATE POLICY "Users can create jam sessions"
  ON jam_sessions FOR INSERT
  WITH CHECK (
    host_id = auth.uid()
    AND (
      band_id IS NULL
      OR (is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
    )
  );

DROP POLICY IF EXISTS "Users can join session" ON jam_session_participants;
CREATE POLICY "Users can join session"
  ON jam_session_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_jam_session_band_member(session_id, auth.uid())
    AND (
      jam_session_band_is_active(session_id)
      OR EXISTS (SELECT 1 FROM jam_sessions s WHERE s.id = session_id AND s.band_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can view messages" ON jam_session_messages;
CREATE POLICY "Users can view messages"
  ON jam_session_messages FOR SELECT
  USING (
    is_jam_session_band_member(session_id, auth.uid())
    AND jam_session_band_is_active(session_id)
  );

DROP POLICY IF EXISTS "Active participants can send messages" ON jam_session_messages;
CREATE POLICY "Active participants can send messages"
  ON jam_session_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_jam_session_participant(session_id, auth.uid())
    AND jam_session_band_is_active(session_id)
    AND EXISTS (SELECT 1 FROM jam_sessions s WHERE s.id = session_id AND s.status <> 'ended')
  );

-- === Places du plan Band : 5, et un abonne Pro peut en prendre une ===
CREATE OR REPLACE FUNCTION check_band_plan_seat_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deux invitations simultanees ne depassent pas la limite.
  PERFORM pg_advisory_xact_lock(hashtext('band_plan_seats:' || NEW.owner_id::text));

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.owner_id AND plan = 'band') THEN
    RAISE EXCEPTION 'Seul un plan Band offre des places' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM band_plan_seats WHERE member_id = NEW.owner_id AND status = 'active') THEN
    RAISE EXCEPTION 'Une place offerte ne se partage pas' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM band_plan_seats WHERE owner_id = NEW.owner_id) >= 5 THEN
    RAISE EXCEPTION 'Toutes les places sont prises' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_band_plan_seat_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.owner_id AND plan = 'band') THEN
    RAISE EXCEPTION 'Le plan Band du titulaire n''est plus actif' USING ERRCODE = '42501';
  END IF;
  -- Un abonne Pro accepte : le serveur programme d'abord la fin de son abonnement.
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.member_id AND plan IN ('free', 'pro')) THEN
    RAISE EXCEPTION 'Il faut d''abord quitter son plan actuel' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
