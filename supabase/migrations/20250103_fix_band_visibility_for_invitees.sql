-- =============================================
-- Fix: Allow invitees to see band details
-- Date: 2025-01-03
-- Description: Invitees need to see band info to accept/decline invitations
-- =============================================

-- Helper function to check if user has a pending invitation to a band
CREATE OR REPLACE FUNCTION has_pending_band_invitation(p_band_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_invitations
    WHERE band_id = p_band_id
    AND invitee_id = p_user_id
    AND status = 'pending'
  );
$$;

-- Drop and recreate the bands SELECT policy to include invitees
DROP POLICY IF EXISTS "Users can view their bands" ON bands;

CREATE POLICY "Users can view their bands"
  ON bands FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_band_member(id, auth.uid())
    OR has_pending_band_invitation(id, auth.uid())
  );
