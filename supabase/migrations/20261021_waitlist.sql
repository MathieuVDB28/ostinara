-- Migration: la liste d'attente du lancement
--
-- La page /acces-anticipe recueille l'email des curieux et le plan qui les
-- interesse ; on leur ouvre l'acces ensuite, par vagues. Personne n'a
-- encore de compte : la table ne reference pas profiles.
--
-- `source` garde d'ou vient l'inscription (?ref=instagram, ?utm_source=…)
-- pour savoir quelle communaute repond le mieux.
--
-- La table n'a aucune policy : personne ne la lit ni ne l'ecrit en direct.
-- Tout passe par trois fonctions SECURITY DEFINER, qui n'exposent que le
-- strict necessaire (un rang, un compteur) sans jamais rendre la liste.

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  plan user_plan NOT NULL DEFAULT 'free',
  source TEXT CHECK (char_length(source) <= 64),
  -- Lien de desinscription des emails : supprime la ligne sans compte.
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Rempli quand on envoie l'invitation, pour traiter la liste par vagues.
  invited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Une adresse = une inscription, quelle que soit la casse.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_unsubscribe_idx ON waitlist (unsubscribe_token);
CREATE INDEX IF NOT EXISTS waitlist_created_idx ON waitlist (created_at);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- === S'inscrire ===
-- Rend le rang dans la liste (pour l'offre des premiers inscrits) et le
-- jeton de desinscription. Adresse deja inscrite : aucune ligne, pour ne
-- rien reveler de l'inscription existante.
CREATE OR REPLACE FUNCTION join_waitlist(p_email TEXT, p_plan user_plan, p_source TEXT)
RETURNS TABLE (signup_rank INTEGER, unsubscribe_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row waitlist%ROWTYPE;
BEGIN
  INSERT INTO waitlist (email, plan, source)
  VALUES (lower(trim(p_email)), p_plan, p_source)
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

-- === Nombre d'inscrits (compteur de places de l'offre de lancement) ===
CREATE OR REPLACE FUNCTION waitlist_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER FROM waitlist;
$$;

-- === Se desinscrire depuis le lien d'un email ===
CREATE OR REPLACE FUNCTION leave_waitlist(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM waitlist WHERE unsubscribe_token = p_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION join_waitlist(TEXT, user_plan, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION waitlist_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION leave_waitlist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_waitlist(TEXT, user_plan, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION waitlist_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION leave_waitlist(UUID) TO anon, authenticated;
