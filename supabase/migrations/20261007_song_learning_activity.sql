-- Migration: activite "song_learning"
-- Un morceau qui passe de « à apprendre » à « en cours » apparait dans le
-- feed des amis, comme le passage à « maîtrisé » (song_mastered).
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'song_learning';

-- Une activite de progression par morceau et par etape : les allers-retours
-- de statut ne doivent pas spammer le feed. Index partiel qui sert aussi la
-- verification d'existence faite avant l'insertion.
CREATE INDEX IF NOT EXISTS activities_user_type_reference_idx
  ON activities (user_id, type, reference_id)
  WHERE reference_id IS NOT NULL;
