-- Migration: les donnees privees du profil quittent `profiles` (2/2)
--
-- A NE PAS APPLIQUER avant que le code qui lit `profile_private` soit en
-- production (cf. 20261104_profile_private et docs/profils-prives.md).
-- Ensuite : deplacer ce fichier dans supabase/migrations/ et l'appliquer.
--
-- Apres elle, `profiles` ne contient plus que ce qui peut etre montre a
-- tous ; la cle anon ne lit plus ni l'abonnement, ni la langue, ni les
-- reglages de personne.

-- Plus d'ancien code pour ecrire dans profiles : le miroir s'arrete
DROP TRIGGER IF EXISTS mirror_profile_private ON profiles;
DROP FUNCTION IF EXISTS mirror_profile_private();

ALTER TABLE profiles
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_period_end,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS practice_reminders,
  DROP COLUMN IF EXISTS badges_synced_at;

-- protect_profile_billing (20261027) ne garde plus que `plan`, la seule
-- colonne d'abonnement restee publique (badge Pro / Band des profils).
CREATE OR REPLACE FUNCTION protect_profile_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free';
  ELSIF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Les champs d''abonnement ne se modifient pas directement'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
