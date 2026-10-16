-- Migration: d'ou vient un morceau
--
-- Les ponts entre features font entrer des morceaux dans la biblio depuis
-- un album ecoute, le feed d'un ami ou un defi accepte. On garde la trace
-- de cette origine : le plan de la semaine s'en sert pour proposer en
-- priorite ce qui vient de donner envie (« Repéré sur Back in Black »).
--
-- Null pour un morceau ajoute a la main, et pour tout l'historique.

ALTER TABLE songs ADD COLUMN IF NOT EXISTS added_from text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS added_from_label text;

DO $$ BEGIN
  ALTER TABLE songs ADD CONSTRAINT songs_added_from_check
    CHECK (added_from IS NULL OR added_from IN ('album', 'friend', 'challenge'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
