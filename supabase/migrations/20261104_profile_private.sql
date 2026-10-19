-- Migration: les donnees privees du profil quittent `profiles` (1/2)
--
-- `profiles` est lisible par tout le monde, sans compte (« Users can view
-- other profiles », USING (true)) : c'est ce qui permet d'afficher un
-- pseudo et un avatar partout. Mais la ligne portait aussi l'abonnement
-- (stripe_*, subscription_*), la langue, les reglages de rappels… lisibles
-- par n'importe qui avec la cle anon.
--
-- Ces colonnes passent dans `profile_private`, lisible par son seul
-- proprietaire. Cf. docs/profils-prives.md.
--
-- Deux temps :
--   1. (ici) creer la table, recopier, tenir la copie a jour pendant la
--      transition : l'ancien code, encore servi pendant le deploiement,
--      ecrit toujours dans `profiles` (webhook Stripe compris).
--   2. (supabase/pending/20261105_profile_private_drop.sql, une fois le
--      nouveau code en production) supprimer les colonnes de `profiles`
--      et le miroir.

CREATE TABLE IF NOT EXISTS profile_private (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_status TEXT,
  subscription_period_end TIMESTAMP WITH TIME ZONE,
  locale TEXT CHECK (locale IN ('fr', 'en')),
  practice_reminders BOOLEAN NOT NULL DEFAULT true,
  badges_synced_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own private profile" ON profile_private;
CREATE POLICY "Users read own private profile"
  ON profile_private FOR SELECT
  USING (auth.uid() = user_id);

-- Le detail de ce qui peut changer est filtre par le trigger ci-dessous
DROP POLICY IF EXISTS "Users update own private profile" ON profile_private;
CREATE POLICY "Users update own private profile"
  ON profile_private FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pas d'INSERT ni de DELETE cote client : la ligne nait avec le profil
-- (trigger) et part avec lui (cascade).

-- === Ce que l'utilisateur peut changer lui-meme : langue et rappels ===
-- L'abonnement s'ecrit par le service role (webhook, checkout), la date
-- de verification des badges aussi (src/lib/badges/sync.ts).
CREATE OR REPLACE FUNCTION protect_profile_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.subscription_period_end IS DISTINCT FROM OLD.subscription_period_end
    OR NEW.badges_synced_at IS DISTINCT FROM OLD.badges_synced_at
  THEN
    RAISE EXCEPTION 'Les champs d''abonnement ne se modifient pas directement'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_private ON profile_private;
CREATE TRIGGER protect_profile_private
  BEFORE UPDATE ON profile_private
  FOR EACH ROW EXECUTE FUNCTION protect_profile_private();

-- === Recopie de l'existant ===
-- Les colonnes stripe_* ont ete ajoutees hors migrations : to_jsonb lit
-- celles qui existent, NULL pour les autres.
INSERT INTO profile_private (
  user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
  subscription_status, subscription_period_end, locale, practice_reminders, badges_synced_at
)
SELECT
  p.id,
  NULLIF(j->>'stripe_customer_id', ''),
  NULLIF(j->>'stripe_subscription_id', ''),
  NULLIF(j->>'stripe_price_id', ''),
  NULLIF(j->>'subscription_status', ''),
  NULLIF(j->>'subscription_period_end', '')::timestamptz,
  CASE WHEN j->>'locale' IN ('fr', 'en') THEN j->>'locale' END,
  COALESCE((j->>'practice_reminders')::boolean, true),
  NULLIF(j->>'badges_synced_at', '')::timestamptz
FROM profiles p, LATERAL to_jsonb(p) AS j
ON CONFLICT (user_id) DO NOTHING;

-- === La ligne privee nait avec le profil ===
-- La langue choisie a l'inscription est dans les metadonnees du compte
-- (src/lib/actions/auth.ts) : on la reprend tout de suite, sans attendre
-- la premiere visite.
CREATE OR REPLACE FUNCTION create_profile_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale TEXT;
BEGIN
  SELECT raw_user_meta_data->>'locale' INTO v_locale FROM auth.users WHERE id = NEW.id;
  INSERT INTO profile_private (user_id, locale)
  VALUES (NEW.id, CASE WHEN v_locale IN ('fr', 'en') THEN v_locale END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS create_profile_private ON profiles;
CREATE TRIGGER create_profile_private
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_profile_private();

-- === Transition : ce que l'ancien code ecrit dans profiles est recopie ===
-- Supprime a l'etape 2, avec les colonnes.
CREATE OR REPLACE FUNCTION mirror_profile_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB := to_jsonb(OLD);
  v_column TEXT;
  v_changed BOOLEAN := false;
BEGIN
  FOREACH v_column IN ARRAY ARRAY[
    'stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id',
    'subscription_status', 'subscription_period_end', 'locale',
    'practice_reminders', 'badges_synced_at'
  ] LOOP
    IF v_new ? v_column AND (v_new -> v_column) IS DISTINCT FROM (v_old -> v_column) THEN
      v_changed := true;
    END IF;
  END LOOP;

  IF NOT v_changed THEN
    RETURN NULL;
  END IF;

  INSERT INTO profile_private (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE profile_private SET
    stripe_customer_id = CASE WHEN v_new ? 'stripe_customer_id' THEN NULLIF(v_new->>'stripe_customer_id', '') ELSE stripe_customer_id END,
    stripe_subscription_id = CASE WHEN v_new ? 'stripe_subscription_id' THEN NULLIF(v_new->>'stripe_subscription_id', '') ELSE stripe_subscription_id END,
    stripe_price_id = CASE WHEN v_new ? 'stripe_price_id' THEN NULLIF(v_new->>'stripe_price_id', '') ELSE stripe_price_id END,
    subscription_status = CASE WHEN v_new ? 'subscription_status' THEN NULLIF(v_new->>'subscription_status', '') ELSE subscription_status END,
    subscription_period_end = CASE WHEN v_new ? 'subscription_period_end' THEN NULLIF(v_new->>'subscription_period_end', '')::timestamptz ELSE subscription_period_end END,
    locale = CASE WHEN v_new->>'locale' IN ('fr', 'en') THEN v_new->>'locale' ELSE locale END,
    practice_reminders = COALESCE((v_new->>'practice_reminders')::boolean, practice_reminders),
    badges_synced_at = CASE WHEN v_new ? 'badges_synced_at' THEN NULLIF(v_new->>'badges_synced_at', '')::timestamptz ELSE badges_synced_at END
  WHERE user_id = NEW.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS mirror_profile_private ON profiles;
CREATE TRIGGER mirror_profile_private
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION mirror_profile_private();
