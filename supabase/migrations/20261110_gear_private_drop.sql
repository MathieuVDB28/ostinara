-- Migration: le detail prive du matos quitte `gear_items` (2/2)
--
-- A appliquer une fois le code qui lit et ecrit `gear_item_private` en
-- production (cf. 20261109_gear_private.sql). Les colonnes sont vides
-- depuis l'etape 1 : il ne reste qu'a les supprimer, avec le trigger de
-- transition.

DROP TRIGGER IF EXISTS move_gear_private ON gear_items;
DROP FUNCTION IF EXISTS move_gear_private();

ALTER TABLE gear_items
  DROP COLUMN IF EXISTS serial_number,
  DROP COLUMN IF EXISTS condition,
  DROP COLUMN IF EXISTS purchase_price,
  DROP COLUMN IF EXISTS purchase_date,
  DROP COLUMN IF EXISTS notes;
