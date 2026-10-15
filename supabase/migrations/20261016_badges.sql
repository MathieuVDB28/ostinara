-- Migration: badges
--
-- Le catalogue vit dans le code (src/lib/badges/catalog.ts) : cette table
-- ne garde que ce qui a ete obtenu, et quand. Un badge a paliers obtient
-- une ligne par niveau (bronze, argent, or), un badge du mois ou de la
-- semaine une ligne par periode — d'ou le compteur « ×3 ».
--
-- Les ecritures passent par le serveur avec la cle de service : c'est lui
-- qui decide qu'un badge est merite, pas le client.

CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  -- 1 a 3 pour un badge a paliers, 1 pour un badge recurrent.
  level smallint NOT NULL DEFAULT 1,
  -- '' pour un badge a paliers, 'AAAA-MM' (mois) ou 'AAAA-MM-JJ' (lundi).
  period text NOT NULL DEFAULT '',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  -- Null tant que le toast « Badge debloque » n'a pas ete montre.
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id, level, period)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON user_badges (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS user_badges_unseen_idx ON user_badges (user_id) WHERE seen_at IS NULL;

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own badges"
    ON user_badges FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Les badges se voient sur le profil d'un ami.
DO $$ BEGIN
  CREATE POLICY "Friends can view friends badges"
    ON user_badges FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = user_badges.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = user_badges.user_id)
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Premiere verification des badges d'un compte : tant qu'elle n'a pas eu
-- lieu, ce qui est deja merite est attribue sans bruit (ni feed, ni toast,
-- ni notification). Un historique de deux ans ne doit pas sonner trente
-- fois le jour de la mise en ligne.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges_synced_at timestamptz;

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'badge_unlocked';
