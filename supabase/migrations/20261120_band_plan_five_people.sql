-- Migration: le plan Band couvre 5 personnes
--
-- Le titulaire offre 4 places, comme un abonnement famille, et un groupe compte
-- 5 membres au plus. Rien ne retire une place ou un membre deja la : seules les
-- nouvelles invitations sont bloquees au-dela de ces limites.

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
  IF (SELECT count(*) FROM band_plan_seats WHERE owner_id = NEW.owner_id) >= 4 THEN
    RAISE EXCEPTION 'Toutes les places sont prises' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

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
  IF (SELECT count(*) FROM band_members WHERE band_id = NEW.band_id) >= 5 THEN
    RAISE EXCEPTION 'Ce groupe est complet' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

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
     + (SELECT count(*) FROM band_invitations WHERE band_id = NEW.band_id AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'Ce groupe est complet' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
