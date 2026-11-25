-- Migration: modifier une repete a venir
--
--   1. `rehearsals.time_zone` : le fuseau de qui l'a creee. C'est l'heure des
--      push et celle des series, qui ne glissent plus au changement d'heure.
--   2. Seuls son auteur, le titulaire et les admins deplacent, modifient ou
--      annulent une repete a venir. Raconter une repete (save_rehearsal_log)
--      et ecrire ses notes restent ouverts a tout membre.
--   3. Une repete deplacee redemande leur presence aux participants.
--   4. Les repetes qui finissent apres minuit avaient une fin avant le debut.

-- === 1. Fuseau ===
ALTER TABLE rehearsals
  ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'Europe/Paris';

-- === 4. Fins apres minuit (avant le trigger qui suit) ===
UPDATE rehearsals
   SET end_date = end_date + INTERVAL '1 day'
 WHERE end_date <= date
   AND end_date > date - INTERVAL '1 day';

-- === 2. Qui modifie ===
CREATE OR REPLACE FUNCTION check_rehearsal_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Le service role et le SQL editor n'ont pas d'auth.uid().
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.band_id IS DISTINCT FROM OLD.band_id THEN
    RAISE EXCEPTION 'rehearsal_edit_not_allowed' USING ERRCODE = '42501';
  END IF;

  IF OLD.created_by = auth.uid() OR is_band_admin_or_owner(OLD.band_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Un compte rendu : tout membre l'ecrit et le corrige, sur une date passee.
  IF NEW.logged_at IS NOT NULL AND NEW.date <= now() + INTERVAL '5 minutes' THEN
    RETURN NEW;
  END IF;

  -- setlist_id passe a NULL tout seul quand la setlist est supprimee.
  IF NEW.date IS DISTINCT FROM OLD.date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.time_zone IS DISTINCT FROM OLD.time_zone
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.location_url IS DISTINCT FROM OLD.location_url
     OR NEW.status IS DISTINCT FROM OLD.status
     OR (NEW.setlist_id IS NOT NULL AND NEW.setlist_id IS DISTINCT FROM OLD.setlist_id) THEN
    RAISE EXCEPTION 'rehearsal_edit_not_allowed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_rehearsal_edit ON rehearsals;
CREATE TRIGGER check_rehearsal_edit
  BEFORE UPDATE ON rehearsals
  FOR EACH ROW EXECUTE FUNCTION check_rehearsal_edit();

-- === 3. Presences redemandees ===
-- SECURITY DEFINER : chacun n'ecrit que sa propre reponse (RLS).
CREATE OR REPLACE FUNCTION reset_rehearsal_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rehearsal_participants
     SET status = 'invited', responded_at = NULL
   WHERE rehearsal_id = NEW.id
     AND user_id IS DISTINCT FROM auth.uid()
     AND status <> 'invited';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reset_rehearsal_rsvp ON rehearsals;
CREATE TRIGGER reset_rehearsal_rsvp
  AFTER UPDATE OF date ON rehearsals
  FOR EACH ROW
  WHEN (OLD.date IS DISTINCT FROM NEW.date AND NEW.logged_at IS NULL AND NEW.status = 'scheduled')
  EXECUTE FUNCTION reset_rehearsal_rsvp();
