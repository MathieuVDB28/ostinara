-- Migration: les fonctions de reordonnancement verifient qui les appelle
--
-- Elles s'executent avec tous les droits (SECURITY DEFINER) : sans controle,
-- tout compte connecte pouvait changer l'ordre de n'importe quelle setlist, y
-- compris dans un groupe en lecture seule. move_setlist_item pouvait en plus
-- deplacer un element d'une autre setlist que celle verifiee.

CREATE OR REPLACE FUNCTION shift_setlist_items(
  p_setlist_id UUID,
  p_from_position INTEGER,
  p_shift_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_write_setlist(p_setlist_id) THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;

  UPDATE setlist_items
  SET position = position + p_shift_amount
  WHERE setlist_id = p_setlist_id
    AND position >= p_from_position;
END;
$$;

CREATE OR REPLACE FUNCTION reorder_setlist_items(p_setlist_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_write_setlist(p_setlist_id) THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;

  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS new_position
    FROM setlist_items
    WHERE setlist_id = p_setlist_id
  )
  UPDATE setlist_items si
  SET position = n.new_position
  FROM numbered n
  WHERE si.id = n.id;
END;
$$;

CREATE OR REPLACE FUNCTION move_setlist_item(
  p_setlist_id UUID,
  p_item_id UUID,
  p_old_position INTEGER,
  p_new_position INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_write_setlist(p_setlist_id) THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;

  IF p_old_position < p_new_position THEN
    -- Moving down: shift items between old and new position up
    UPDATE setlist_items
    SET position = position - 1
    WHERE setlist_id = p_setlist_id
      AND position > p_old_position
      AND position <= p_new_position;
  ELSE
    -- Moving up: shift items between new and old position down
    UPDATE setlist_items
    SET position = position + 1
    WHERE setlist_id = p_setlist_id
      AND position >= p_new_position
      AND position < p_old_position;
  END IF;

  -- Update the moved item
  UPDATE setlist_items
  SET position = p_new_position
  WHERE id = p_item_id
    AND setlist_id = p_setlist_id;
END;
$$;

REVOKE ALL ON FUNCTION shift_setlist_items(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_setlist_items(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION move_setlist_item(UUID, UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shift_setlist_items(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_setlist_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_setlist_item(UUID, UUID, INTEGER, INTEGER) TO authenticated;
