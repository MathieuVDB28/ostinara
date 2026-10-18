-- Migration: les instruments du musicien
--
-- Ostinara n'est plus l'app des seuls guitaristes : bassistes, batteurs et
-- claviers doivent y trouver leur compte, en particulier dans un groupe
-- (plan Band) ou chaque membre joue autre chose.
--
-- Un musicien joue souvent de plusieurs instruments : une ligne par
-- instrument, avec un niveau, et exactement un instrument principal qui
-- decide de ce que l'app montre par defaut (exercices, outils, accordeur).
--
-- `custom_label` precise « autre » (ukulele, violon…), et rien d'autre.

DO $$ BEGIN
  CREATE TYPE instrument AS ENUM ('guitar', 'bass', 'drums', 'keys', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS profile_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instrument instrument NOT NULL,
  level skill_level NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  custom_label TEXT CHECK (
    custom_label IS NULL
    OR (instrument = 'other' AND char_length(custom_label) BETWEEN 1 AND 40)
  ),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, instrument)
);

-- Un seul instrument principal par musicien.
CREATE UNIQUE INDEX IF NOT EXISTS profile_instruments_primary_idx
  ON profile_instruments (user_id) WHERE is_primary;

ALTER TABLE profile_instruments ENABLE ROW LEVEL SECURITY;

-- Lisible comme le profil lui-meme (cf. "Users can view other profiles") :
-- l'instrument fait partie de l'identite, pas du contenu prive.
DROP POLICY IF EXISTS "Instruments are visible to everyone" ON profile_instruments;
CREATE POLICY "Instruments are visible to everyone"
  ON profile_instruments FOR SELECT
  USING (true);

-- Pas de policy d'ecriture : tout passe par set_my_instruments, qui
-- remplace la liste d'un bloc et garantit l'instrument principal.

-- === Remplacer ses instruments ===
-- p_instruments : [{"instrument": "bass", "level": "advanced",
--                   "is_primary": true, "custom_label": null}, …]
CREATE OR REPLACE FUNCTION set_my_instruments(p_instruments JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  IF jsonb_typeof(p_instruments) <> 'array' OR jsonb_array_length(p_instruments) = 0 THEN
    RAISE EXCEPTION 'Au moins un instrument';
  END IF;

  IF (SELECT count(*) FROM jsonb_array_elements(p_instruments) e
      WHERE (e->>'is_primary')::BOOLEAN) <> 1 THEN
    RAISE EXCEPTION 'Exactement un instrument principal';
  END IF;

  DELETE FROM profile_instruments WHERE user_id = v_user;

  INSERT INTO profile_instruments (user_id, instrument, level, is_primary, custom_label)
  SELECT
    v_user,
    (e->>'instrument')::instrument,
    (e->>'level')::skill_level,
    COALESCE((e->>'is_primary')::BOOLEAN, false),
    CASE WHEN e->>'instrument' = 'other' THEN NULLIF(trim(e->>'custom_label'), '') END
  FROM jsonb_array_elements(p_instruments) e;
END;
$$;

REVOKE ALL ON FUNCTION set_my_instruments(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_my_instruments(JSONB) TO authenticated;

-- === Liste d'attente : de quoi jouent les inscrits ===
-- Pour savoir qui arrive vraiment, maintenant qu'on parle a tous les
-- musiciens. Les inscriptions d'avant restent avec une liste vide.
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS instruments instrument[] NOT NULL DEFAULT '{}';

-- La signature change : on remplace la fonction. Le parametre a une valeur
-- par defaut, si bien qu'un appel a trois arguments (version deployee
-- avant le front) continue de fonctionner pendant la mise en ligne.
DROP FUNCTION IF EXISTS join_waitlist(TEXT, user_plan, TEXT);

CREATE OR REPLACE FUNCTION join_waitlist(
  p_email TEXT,
  p_plan user_plan,
  p_source TEXT,
  p_instruments instrument[] DEFAULT '{}'
)
RETURNS TABLE (signup_rank INTEGER, unsubscribe_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row waitlist%ROWTYPE;
BEGIN
  INSERT INTO waitlist (email, plan, source, instruments)
  VALUES (lower(trim(p_email)), p_plan, p_source, COALESCE(p_instruments, '{}'))
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

REVOKE ALL ON FUNCTION join_waitlist(TEXT, user_plan, TEXT, instrument[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_waitlist(TEXT, user_plan, TEXT, instrument[]) TO anon, authenticated;
