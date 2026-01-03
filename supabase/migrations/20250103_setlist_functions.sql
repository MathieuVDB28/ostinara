-- =============================================
-- Migration: Setlist Functions
-- Date: 2025-01-03
-- Description: Database functions for setlist item reordering
-- =============================================

-- Function to shift items when inserting
CREATE OR REPLACE FUNCTION shift_setlist_items(
  p_setlist_id UUID,
  p_from_position INTEGER,
  p_shift_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE setlist_items
  SET position = position + p_shift_amount
  WHERE setlist_id = p_setlist_id
    AND position >= p_from_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder items after deletion (close gaps)
CREATE OR REPLACE FUNCTION reorder_setlist_items(p_setlist_id UUID)
RETURNS VOID AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move item from one position to another
CREATE OR REPLACE FUNCTION move_setlist_item(
  p_setlist_id UUID,
  p_item_id UUID,
  p_old_position INTEGER,
  p_new_position INTEGER
)
RETURNS VOID AS $$
BEGIN
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
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION shift_setlist_items TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_setlist_items TO authenticated;
GRANT EXECUTE ON FUNCTION move_setlist_item TO authenticated;
