-- Migration: la langue de chacun (francais / anglais)
--
-- L'app sert le francais ou l'anglais d'apres un cookie (pays de l'IP,
-- langue du navigateur, puis choix dans Reglages). Ce qui part sans
-- requete — push, rappels du cron, emails de la liste d'attente — n'a pas
-- de cookie : la langue est donc aussi gardee en base.
--
-- NULL = pas encore connue (comptes d'avant) : le layout principal la
-- renseigne a la premiere visite, et les envois retombent sur le francais.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale TEXT CHECK (locale IN ('fr', 'en'));

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en'));

-- join_waitlist recoit la langue de la page d'inscription.
DROP FUNCTION IF EXISTS join_waitlist(TEXT, user_plan, TEXT, instrument[]);

CREATE OR REPLACE FUNCTION join_waitlist(
  p_email TEXT,
  p_plan user_plan,
  p_source TEXT,
  p_instruments instrument[] DEFAULT '{}',
  p_locale TEXT DEFAULT 'fr'
)
RETURNS TABLE (signup_rank INTEGER, unsubscribe_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row waitlist%ROWTYPE;
BEGIN
  INSERT INTO waitlist (email, plan, source, instruments, locale)
  VALUES (
    lower(trim(p_email)), p_plan, p_source, COALESCE(p_instruments, '{}'),
    CASE WHEN p_locale = 'en' THEN 'en' ELSE 'fr' END
  )
  ON CONFLICT ((lower(email))) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      (SELECT count(*)::INTEGER FROM waitlist w WHERE w.created_at <= v_row.created_at),
      v_row.unsubscribe_token;
END;
$$;

REVOKE ALL ON FUNCTION join_waitlist(TEXT, user_plan, TEXT, instrument[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_waitlist(TEXT, user_plan, TEXT, instrument[], TEXT) TO anon, authenticated;
