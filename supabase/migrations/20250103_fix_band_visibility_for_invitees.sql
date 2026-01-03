-- =============================================
-- Fix: Allow invitees to see band details and join bands
-- Date: 2025-01-03
-- Description: Invitees need to see band info and be able to join when accepting
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

-- Also check for accepted invitation (for the brief moment during acceptance)
CREATE OR REPLACE FUNCTION has_accepted_band_invitation(p_band_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_invitations
    WHERE band_id = p_band_id
    AND invitee_id = p_user_id
    AND status = 'accepted'
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

-- Fix: Allow invited users to add themselves as members
DROP POLICY IF EXISTS "Band owner or admin can add members" ON band_members;

CREATE POLICY "Band owner or admin can add members"
  ON band_members FOR INSERT
  WITH CHECK (
    -- Case 1: Owner adding themselves when creating band
    (
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM bands
        WHERE bands.id = band_id
        AND bands.owner_id = auth.uid()
      )
    )
    OR
    -- Case 2: Owner or admin adding other members
    is_band_admin_or_owner(band_id, auth.uid())
    OR
    -- Case 3: User with accepted invitation adding themselves
    (
      user_id = auth.uid()
      AND role = 'member'
      AND has_accepted_band_invitation(band_id, auth.uid())
    )
  );
