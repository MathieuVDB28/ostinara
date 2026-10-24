-- Migration: la wishlist matos se montre (feed et profil)
--
-- Elle n'etait lisible que par son proprietaire. Elle suit maintenant la
-- regle des covers (20261109_gear_private) : « Public » par defaut, ce qui
-- va aussi loin que le profil (tout le monde sur un profil public, les
-- amis sur un profil prive) ; « Amis » la garde entre amis.
-- Une envie ajoutee cree l'activite `gear_wishlisted` pour les amis.

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'gear_wishlisted';

ALTER TABLE gear_wishlist
  ADD COLUMN IF NOT EXISTS visibility gear_visibility NOT NULL DEFAULT 'public';

-- On change la visibilite d'une envie apres coup.
DROP POLICY IF EXISTS "Users can update own wishlist" ON gear_wishlist;
CREATE POLICY "Users can update own wishlist"
  ON gear_wishlist FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Friends can view shared gear wishlist" ON gear_wishlist;
CREATE POLICY "Friends can view shared gear wishlist"
  ON gear_wishlist FOR SELECT
  USING (
    visibility IN ('friends', 'public')
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = gear_wishlist.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = gear_wishlist.user_id)
        )
    )
  );

DROP POLICY IF EXISTS "Anyone can view public gear wishlist of public profiles" ON gear_wishlist;
CREATE POLICY "Anyone can view public gear wishlist of public profiles"
  ON gear_wishlist FOR SELECT
  USING (
    visibility = 'public'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = gear_wishlist.user_id AND p.is_private IS NOT TRUE)
  );
