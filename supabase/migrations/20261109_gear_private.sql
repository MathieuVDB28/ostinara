-- Migration: le detail prive du matos quitte `gear_items` (1/2), et la
-- vitrine des profils publics
--
-- === Le matos ===
-- Les policies de `gear_items` donnent la ligne entiere : aux amis pour le
-- matos « Amis », a n'importe qui, sans compte, pour le matos « Public ».
-- Numero de serie, prix et date d'achat, etat et notes perso etaient donc
-- lisibles avec la cle anon. Ils passent dans `gear_item_private`, lisible
-- par son seul proprietaire. Meme demarche que profile_private
-- (20261104 / 20261105).
--
-- Deux temps :
--   1. (ici) creer la table, y deplacer les valeurs et les effacer de
--      `gear_items` tout de suite (la fuite cesse des cette migration).
--      L'ancien code, encore servi pendant le deploiement, ecrit toujours
--      ces colonnes : un trigger les deplace a la volee.
--   2. (20261110_gear_private_drop.sql, une fois le nouveau code en
--      production) supprimer les colonnes et le trigger.
--
-- === La vitrine ===
-- Un profil public montre aux non-amis sa vitrine : favoris, badges, matos
-- et covers « Public », chiffres de pratique. La biblio, les albums notes,
-- la wishlist, les playlists et les sessions restent entre amis. Les
-- morceaux favoris et les badges n'etaient lisibles qu'entre amis : on les
-- ouvre aux profils publics. Les nouveaux comptes sont prives par defaut.

-- =============================================
-- 1. gear_item_private
-- =============================================

CREATE TABLE IF NOT EXISTS gear_item_private (
  -- DEFERRABLE : le trigger de transition y ecrit avant que la ligne de
  -- gear_items existe (BEFORE INSERT).
  gear_id UUID PRIMARY KEY REFERENCES gear_items(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  serial_number TEXT,
  condition gear_condition,
  purchase_price NUMERIC,
  purchase_date DATE,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gear_item_private_user_id ON gear_item_private(user_id);

ALTER TABLE gear_item_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own gear details" ON gear_item_private;
CREATE POLICY "Users read own gear details"
  ON gear_item_private FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own gear details" ON gear_item_private;
CREATE POLICY "Users insert own gear details"
  ON gear_item_private FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM gear_items g WHERE g.id = gear_id AND g.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users update own gear details" ON gear_item_private;
CREATE POLICY "Users update own gear details"
  ON gear_item_private FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM gear_items g WHERE g.id = gear_id AND g.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users delete own gear details" ON gear_item_private;
CREATE POLICY "Users delete own gear details"
  ON gear_item_private FOR DELETE
  USING (auth.uid() = user_id);

-- === Recopie de l'existant, puis effacement dans gear_items ===
INSERT INTO gear_item_private (gear_id, user_id, serial_number, condition, purchase_price, purchase_date, notes)
SELECT id, user_id, serial_number, condition, purchase_price, purchase_date, notes
FROM gear_items
WHERE serial_number IS NOT NULL
   OR condition IS NOT NULL
   OR purchase_price IS NOT NULL
   OR purchase_date IS NOT NULL
   OR notes IS NOT NULL
ON CONFLICT (gear_id) DO NOTHING;

UPDATE gear_items
SET serial_number = NULL, condition = NULL, purchase_price = NULL, purchase_date = NULL, notes = NULL
WHERE serial_number IS NOT NULL
   OR condition IS NOT NULL
   OR purchase_price IS NOT NULL
   OR purchase_date IS NOT NULL
   OR notes IS NOT NULL;

-- === Transition : ce que l'ancien code ecrit dans gear_items est deplace ===
-- Supprime a l'etape 2, avec les colonnes.
CREATE OR REPLACE FUNCTION move_gear_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.condition IS NULL AND NEW.purchase_price IS NULL
    AND NEW.purchase_date IS NULL AND NEW.notes IS NULL
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO gear_item_private (gear_id, user_id, serial_number, condition, purchase_price, purchase_date, notes)
  VALUES (NEW.id, NEW.user_id, NEW.serial_number, NEW.condition, NEW.purchase_price, NEW.purchase_date, NEW.notes)
  ON CONFLICT (gear_id) DO UPDATE SET
    serial_number = EXCLUDED.serial_number,
    condition = EXCLUDED.condition,
    purchase_price = EXCLUDED.purchase_price,
    purchase_date = EXCLUDED.purchase_date,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  NEW.serial_number := NULL;
  NEW.condition := NULL;
  NEW.purchase_price := NULL;
  NEW.purchase_date := NULL;
  NEW.notes := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS move_gear_private ON gear_items;
CREATE TRIGGER move_gear_private
  BEFORE INSERT OR UPDATE ON gear_items
  FOR EACH ROW EXECUTE FUNCTION move_gear_private();

-- =============================================
-- 2. Vitrine : morceaux favoris
-- =============================================
-- `favorite_songs` est deja lisible pour un profil public, mais le morceau
-- (songs, entre amis) ne l'est pas : la vitrine revenait vide. Plutot que
-- d'ouvrir la ligne `songs` entiere (notes, tabs…), on n'en rend que ce
-- que la vitrine affiche.
CREATE OR REPLACE FUNCTION get_profile_favorite_songs(p_user_id UUID)
-- « slot » et non « position », mot reserve de PostgreSQL
RETURNS TABLE (id UUID, song_id UUID, slot INTEGER, title TEXT, artist TEXT, cover_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fs.id, s.id, fs.position, s.title, s.artist, s.cover_url
  FROM favorite_songs fs
  JOIN songs s ON s.id = fs.song_id
  WHERE fs.user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = p_user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = p_user_id)
          )
      )
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = p_user_id AND p.is_private IS NOT TRUE)
    )
  ORDER BY fs.position;
$$;

REVOKE ALL ON FUNCTION get_profile_favorite_songs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profile_favorite_songs(UUID) TO authenticated;

-- =============================================
-- 3. Vitrine : badges
-- =============================================
DROP POLICY IF EXISTS "Public profiles badges are visible" ON user_badges;
CREATE POLICY "Public profiles badges are visible"
  ON user_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_badges.user_id AND p.is_private IS NOT TRUE)
  );

-- =============================================
-- 4. Prive par defaut
-- =============================================
-- Le choix reste propose a l'inscription ; un compte cree sans (OAuth) est
-- prive.
ALTER TABLE profiles ALTER COLUMN is_private SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_private)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 5. Un profil prive ramene le « Public » a « Amis »
-- =============================================
-- « Public » sur une cover ou un matos veut dire « aussi loin que mon
-- profil » : tout le monde si le profil est public, les amis s'il est
-- prive. La valeur stockee ne change pas : repasser son profil en public
-- rend a nouveau publiques les covers et le matos qui l'etaient.

-- Covers : les amis voient « Amis » et « Public », les autres le « Public »
-- des profils publics seulement.
DROP POLICY IF EXISTS "Anyone can view public covers" ON covers;
DROP POLICY IF EXISTS "Friends can view friend-visible covers" ON covers;
DROP POLICY IF EXISTS "Friends can view friends covers" ON covers;
DROP POLICY IF EXISTS "Friends can view shared covers" ON covers;
DROP POLICY IF EXISTS "Anyone can view public covers of public profiles" ON covers;

CREATE POLICY "Friends can view shared covers"
  ON covers FOR SELECT
  USING (
    visibility IN ('friends', 'public')
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = covers.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = covers.user_id)
        )
    )
  );

CREATE POLICY "Anyone can view public covers of public profiles"
  ON covers FOR SELECT
  USING (
    visibility = 'public'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = covers.user_id AND p.is_private IS NOT TRUE)
  );

-- Le morceau derriere une cover partagee suit la meme regle.
DROP POLICY IF EXISTS "Users can view songs behind shared covers" ON songs;
CREATE POLICY "Users can view songs behind shared covers"
  ON songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM covers c
      WHERE c.song_id = songs.id
        AND (
          (
            c.visibility = 'public'
            AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = songs.user_id AND p.is_private IS NOT TRUE)
          )
          OR (
            c.visibility IN ('friends', 'public')
            AND EXISTS (
              SELECT 1 FROM friendships f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = auth.uid() AND f.addressee_id = songs.user_id)
                  OR (f.addressee_id = auth.uid() AND f.requester_id = songs.user_id)
                )
            )
          )
        )
    )
  );

-- Matos : les amis voyaient deja « Amis » et « Public ».
DROP POLICY IF EXISTS "Anyone can view public gear" ON gear_items;
CREATE POLICY "Anyone can view public gear"
  ON gear_items FOR SELECT
  USING (
    visibility = 'public'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = gear_items.user_id AND p.is_private IS NOT TRUE)
  );
