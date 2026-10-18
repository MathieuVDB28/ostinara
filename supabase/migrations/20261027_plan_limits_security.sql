-- Migration: plan Free limite a 2 instruments, et le plan devient intouchable
--
-- 1. Les colonnes d'abonnement de `profiles` (plan, stripe_*,
--    subscription_status) ne s'ecrivent plus que par le service role
--    (webhook Stripe, checkout) ou le proprietaire de la base. La policy
--    « Users can update own profile » laissait n'importe qui passer en Band
--    depuis le navigateur, ou recopier le stripe_customer_id d'un autre pour
--    heriter de son abonnement via le webhook.
--
-- 2. set_my_instruments refuse plus de 2 instruments en Free. Qui en avait
--    deja plus (avant la limite, ou apres un retour au Free) les garde mais
--    n'en ajoute pas. Les ecritures sur profile_instruments passent toutes
--    par cette fonction (aucune policy d'ecriture sur la table).

-- === 1. Colonnes d'abonnement verrouillees ===
CREATE OR REPLACE FUNCTION protect_profile_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Les colonnes stripe_* ont ete ajoutees hors migrations : on passe par
  -- to_jsonb pour ne toucher que celles qui existent vraiment.
  v_columns TEXT[] := ARRAY[
    'plan', 'stripe_customer_id', 'stripe_subscription_id',
    'stripe_price_id', 'subscription_status'
  ];
  v_new JSONB := to_jsonb(NEW);
  v_reset JSONB := '{}';
  v_column TEXT;
BEGIN
  -- Seules les requetes des utilisateurs (anon / authenticated, via
  -- PostgREST) sont bridees. service_role et postgres (triggers SECURITY
  -- DEFINER comme handle_new_user, SQL editor) passent.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    FOREACH v_column IN ARRAY v_columns LOOP
      IF v_new ? v_column THEN
        v_reset := v_reset || jsonb_build_object(
          v_column, CASE WHEN v_column = 'plan' THEN 'free' END
        );
      END IF;
    END LOOP;
    RETURN jsonb_populate_record(NEW, v_reset);
  END IF;

  FOREACH v_column IN ARRAY v_columns LOOP
    IF v_new -> v_column IS DISTINCT FROM to_jsonb(OLD) -> v_column THEN
      RAISE EXCEPTION 'Les champs d''abonnement ne se modifient pas directement'
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_billing ON profiles;
CREATE TRIGGER protect_profile_billing
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_billing();

-- === 2. Limite d'instruments selon le plan ===
CREATE OR REPLACE FUNCTION set_my_instruments(p_instruments JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_plan user_plan;
  v_count INTEGER;
  v_current INTEGER;
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

  SELECT COALESCE(plan, 'free') INTO v_plan FROM profiles WHERE id = v_user;
  v_count := jsonb_array_length(p_instruments);

  IF COALESCE(v_plan, 'free') = 'free' AND v_count > 2 THEN
    SELECT count(*) INTO v_current FROM profile_instruments WHERE user_id = v_user;
    IF v_count > GREATEST(2, v_current) THEN
      RAISE EXCEPTION 'Le plan Free est limite a 2 instruments'
        USING ERRCODE = '42501';
    END IF;
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
