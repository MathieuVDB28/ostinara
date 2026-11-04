-- Migration: plan Band partage, facon abonnement famille
--
-- Le titulaire d'un plan Band offre 2 places, soit 3 personnes en tout.
-- L'invite accepte et obtient tout le plan Band.
--
-- `profiles.plan` reste la seule source de verite des droits : les triggers
-- le tiennent a jour avec les places, dans la meme transaction. Rien d'autre
-- dans l'app n'a a savoir si un plan Band est paye ou offert.
--
-- Ecrit par le serveur seulement (service role), lu par les deux personnes.

CREATE TABLE IF NOT EXISTS band_plan_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (owner_id, member_id),
  CHECK (owner_id <> member_id)
);

-- Une seule place occupee par personne.
CREATE UNIQUE INDEX IF NOT EXISTS band_plan_seats_one_active
  ON band_plan_seats (member_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS band_plan_seats_member_idx ON band_plan_seats (member_id);

ALTER TABLE band_plan_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seats readable by owner and member" ON band_plan_seats;
CREATE POLICY "Seats readable by owner and member"
  ON band_plan_seats FOR SELECT
  USING (owner_id = auth.uid() OR member_id = auth.uid());

-- Avant une invitation : un plan Band qui n'est pas lui-meme offert, 2 places.
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
  IF (SELECT count(*) FROM band_plan_seats WHERE owner_id = NEW.owner_id) >= 2 THEN
    RAISE EXCEPTION 'Toutes les places sont prises' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_plan_seat_invite ON band_plan_seats;
CREATE TRIGGER check_band_plan_seat_invite
  BEFORE INSERT ON band_plan_seats
  FOR EACH ROW EXECUTE FUNCTION check_band_plan_seat_invite();

-- Avant d'accepter : le titulaire a toujours son plan, et l'invite n'a aucun
-- plan a perdre (il resilie d'abord, sinon il paierait pour rien).
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
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.member_id AND plan = 'free') THEN
    RAISE EXCEPTION 'Il faut d''abord quitter son plan actuel' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_plan_seat_accept ON band_plan_seats;
CREATE TRIGGER check_band_plan_seat_accept
  BEFORE UPDATE OF status ON band_plan_seats
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status = 'pending')
  EXECUTE FUNCTION check_band_plan_seat_accept();

-- Une place occupee donne le plan Band, une place rendue le retire.
CREATE OR REPLACE FUNCTION apply_band_plan_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE profiles SET plan = 'free' WHERE id = OLD.member_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    UPDATE profiles SET plan = 'band' WHERE id = NEW.member_id;
    -- Ses autres invitations n'ont plus d'objet : elles liberent les places.
    DELETE FROM band_plan_seats
      WHERE member_id = NEW.member_id AND status = 'pending' AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_band_plan_seat ON band_plan_seats;
CREATE TRIGGER apply_band_plan_seat
  AFTER UPDATE OF status OR DELETE ON band_plan_seats
  FOR EACH ROW EXECUTE FUNCTION apply_band_plan_seat();

-- Le titulaire quitte le plan Band (resiliation, impaye, passage en Pro) : les
-- places tombent avec, et les invites repassent en Free.
CREATE OR REPLACE FUNCTION release_band_plan_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM band_plan_seats WHERE owner_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_band_plan_seats ON profiles;
CREATE TRIGGER release_band_plan_seats
  AFTER UPDATE OF plan ON profiles
  FOR EACH ROW
  WHEN (OLD.plan = 'band' AND NEW.plan <> 'band')
  EXECUTE FUNCTION release_band_plan_seats();
