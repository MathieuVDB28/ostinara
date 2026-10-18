-- Migration: le poste de chacun dans le groupe
--
-- Dans un groupe, ce qui compte n'est pas tout ce qu'un membre sait jouer
-- mais ce qu'il y tient : Lea joue de la guitare et de la basse, elle est
-- bassiste dans ce groupe-ci. `band_members.instrument` porte ce poste ;
-- `instrument_label` precise « autre » (chant, saxo, percussions…).
--
-- A l'entree dans le groupe, le poste vaut l'instrument principal du
-- membre ; on le change ensuite soi-meme, ou le proprietaire / un admin
-- le change pour lui.

ALTER TABLE band_members ADD COLUMN IF NOT EXISTS instrument instrument;
ALTER TABLE band_members ADD COLUMN IF NOT EXISTS instrument_label TEXT
  CHECK (instrument_label IS NULL OR char_length(instrument_label) BETWEEN 1 AND 40);

-- === Poste par defaut : l'instrument principal ===
CREATE OR REPLACE FUNCTION default_band_member_instrument()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.instrument IS NULL THEN
    SELECT pi.instrument, pi.custom_label
      INTO NEW.instrument, NEW.instrument_label
      FROM profile_instruments pi
     WHERE pi.user_id = NEW.user_id AND pi.is_primary
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS band_members_default_instrument ON band_members;
CREATE TRIGGER band_members_default_instrument
  BEFORE INSERT ON band_members
  FOR EACH ROW EXECUTE FUNCTION default_band_member_instrument();

-- Les membres actuels.
UPDATE band_members bm
   SET instrument = pi.instrument,
       instrument_label = pi.custom_label
  FROM profile_instruments pi
 WHERE pi.user_id = bm.user_id
   AND pi.is_primary
   AND bm.instrument IS NULL;

-- === Changer un poste ===
-- Soi-meme, ou le proprietaire / un admin pour un autre membre. La policy
-- UPDATE de band_members est reservee au proprietaire : on passe par ici
-- pour ne toucher qu'au poste, rien d'autre (pas le role).
CREATE OR REPLACE FUNCTION set_band_member_instrument(
  p_band_id UUID,
  p_user_id UUID,
  p_instrument instrument,
  p_label TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  IF auth.uid() <> p_user_id AND NOT is_band_admin_or_owner(p_band_id, auth.uid()) THEN
    RAISE EXCEPTION 'Droits insuffisants';
  END IF;

  UPDATE band_members
     SET instrument = p_instrument,
         instrument_label = CASE WHEN p_instrument = 'other' THEN NULLIF(trim(p_label), '') END
   WHERE band_id = p_band_id
     AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION set_band_member_instrument(UUID, UUID, instrument, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_band_member_instrument(UUID, UUID, instrument, TEXT) TO authenticated;
