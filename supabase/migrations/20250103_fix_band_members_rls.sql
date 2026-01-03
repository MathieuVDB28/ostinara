-- =============================================
-- Fix: Band members RLS infinite recursion
-- Date: 2025-01-03
-- Description: Fix self-referencing policies using SECURITY DEFINER function
-- =============================================

-- =============================================
-- Helper function to check band membership (bypasses RLS)
-- =============================================
CREATE OR REPLACE FUNCTION is_band_member(p_band_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_band_admin_or_owner(p_band_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
$$;

-- =============================================
-- Drop existing problematic policies
-- =============================================
DROP POLICY IF EXISTS "Band members can view members" ON band_members;
DROP POLICY IF EXISTS "Band owner/admin can add members" ON band_members;
DROP POLICY IF EXISTS "Band owner can update members" ON band_members;
DROP POLICY IF EXISTS "Band owner can remove members or member can leave" ON band_members;
DROP POLICY IF EXISTS "Band members can view their bands" ON bands;

-- Also drop policies on other tables that reference band_members
DROP POLICY IF EXISTS "Users can view own setlists or band setlists" ON setlists;
DROP POLICY IF EXISTS "Users can create personal setlists or band setlists" ON setlists;
DROP POLICY IF EXISTS "Users can update own or band setlists" ON setlists;
DROP POLICY IF EXISTS "Users can delete own or band setlists" ON setlists;
DROP POLICY IF EXISTS "Users can view items of accessible setlists" ON setlist_items;
DROP POLICY IF EXISTS "Users can insert items in accessible setlists" ON setlist_items;
DROP POLICY IF EXISTS "Users can update items in accessible setlists" ON setlist_items;
DROP POLICY IF EXISTS "Users can delete items in accessible setlists" ON setlist_items;
DROP POLICY IF EXISTS "Band members can send invitations" ON band_invitations;

-- =============================================
-- Fixed RLS Policies: bands
-- =============================================
CREATE POLICY "Users can view their bands"
  ON bands FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_band_member(id, auth.uid())
  );

-- =============================================
-- Fixed RLS Policies: band_members
-- =============================================
CREATE POLICY "Users can view band members"
  ON band_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_band_member(band_id, auth.uid())
  );

CREATE POLICY "Band owner or admin can add members"
  ON band_members FOR INSERT
  WITH CHECK (
    -- Owner adding themselves when creating band
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
    -- Owner or admin adding other members
    is_band_admin_or_owner(band_id, auth.uid())
  );

CREATE POLICY "Band owner can update members"
  ON band_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bands
      WHERE bands.id = band_members.band_id
      AND bands.owner_id = auth.uid()
    )
  );

CREATE POLICY "Band owner can remove or member can leave"
  ON band_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bands
      WHERE bands.id = band_members.band_id
      AND bands.owner_id = auth.uid()
    )
  );

-- =============================================
-- Fixed RLS Policies: band_invitations
-- =============================================
CREATE POLICY "Band members can send invitations"
  ON band_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND is_band_member(band_id, auth.uid())
  );

-- =============================================
-- Fixed RLS Policies: setlists
-- =============================================
CREATE POLICY "Users can view own setlists or band setlists"
  ON setlists FOR SELECT
  USING (
    user_id = auth.uid()
    OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()))
  );

CREATE POLICY "Users can create personal setlists or band setlists"
  ON setlists FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      is_personal = true
      OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()))
    )
  );

CREATE POLICY "Users can update own or band setlists"
  ON setlists FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()))
  );

CREATE POLICY "Users can delete own or band setlists"
  ON setlists FOR DELETE
  USING (
    user_id = auth.uid()
    OR (band_id IS NOT NULL AND is_band_member(band_id, auth.uid()))
  );

-- =============================================
-- Fixed RLS Policies: setlist_items
-- =============================================
CREATE POLICY "Users can view items of accessible setlists"
  ON setlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND (
        setlists.user_id = auth.uid()
        OR (setlists.band_id IS NOT NULL AND is_band_member(setlists.band_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can insert items in accessible setlists"
  ON setlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND (
        setlists.user_id = auth.uid()
        OR (setlists.band_id IS NOT NULL AND is_band_member(setlists.band_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can update items in accessible setlists"
  ON setlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND (
        setlists.user_id = auth.uid()
        OR (setlists.band_id IS NOT NULL AND is_band_member(setlists.band_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can delete items in accessible setlists"
  ON setlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND (
        setlists.user_id = auth.uid()
        OR (setlists.band_id IS NOT NULL AND is_band_member(setlists.band_id, auth.uid()))
      )
    )
  );
