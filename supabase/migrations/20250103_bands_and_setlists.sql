-- =============================================
-- Migration: Bands and Setlists
-- Date: 2025-01-03
-- Description: Tables for band management and setlist builder
-- =============================================

-- =============================================
-- Types enum
-- =============================================
CREATE TYPE band_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE band_invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE setlist_item_type AS ENUM ('song', 'section');

-- =============================================
-- Table: bands
-- =============================================
CREATE TABLE IF NOT EXISTS bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bands_owner_idx ON bands(owner_id);

-- =============================================
-- Table: band_members
-- =============================================
CREATE TABLE IF NOT EXISTS band_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role band_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_band_member UNIQUE (band_id, user_id)
);

CREATE INDEX IF NOT EXISTS band_members_band_idx ON band_members(band_id);
CREATE INDEX IF NOT EXISTS band_members_user_idx ON band_members(user_id);

-- =============================================
-- Table: band_invitations
-- =============================================
CREATE TABLE IF NOT EXISTS band_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status band_invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT no_self_invitation CHECK (inviter_id != invitee_id)
);

CREATE INDEX IF NOT EXISTS band_invitations_band_idx ON band_invitations(band_id);
CREATE INDEX IF NOT EXISTS band_invitations_invitee_idx ON band_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS band_invitations_status_idx ON band_invitations(status);

-- =============================================
-- Table: setlists
-- =============================================
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  concert_date DATE,
  venue TEXT,
  band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_personal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS setlists_band_idx ON setlists(band_id);
CREATE INDEX IF NOT EXISTS setlists_user_idx ON setlists(user_id);
CREATE INDEX IF NOT EXISTS setlists_concert_date_idx ON setlists(concert_date);

-- =============================================
-- Table: setlist_items
-- =============================================
CREATE TABLE IF NOT EXISTS setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  item_type setlist_item_type NOT NULL,

  -- For songs
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  song_title TEXT,
  song_artist TEXT,
  song_cover_url TEXT,
  song_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- For sections
  section_name TEXT,

  -- Common fields
  notes TEXT,
  transition_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS setlist_items_setlist_idx ON setlist_items(setlist_id);
CREATE INDEX IF NOT EXISTS setlist_items_position_idx ON setlist_items(setlist_id, position);

-- =============================================
-- Triggers: updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bands_updated_at
  BEFORE UPDATE ON bands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_band_invitations_updated_at
  BEFORE UPDATE ON band_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlist_items_updated_at
  BEFORE UPDATE ON setlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS: Enable
-- =============================================
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: bands
-- =============================================
CREATE POLICY "Band members can view their bands"
  ON bands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Band plan users can create bands"
  ON bands FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.plan = 'band'
    )
  );

CREATE POLICY "Band owner can update band"
  ON bands FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Band owner can delete band"
  ON bands FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================
-- RLS Policies: band_members
-- =============================================
CREATE POLICY "Band members can view members"
  ON band_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Band owner/admin can add members"
  ON band_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
    )
    OR (
      -- Allow inserting self as owner when creating band
      band_members.user_id = auth.uid()
      AND band_members.role = 'owner'
      AND EXISTS (
        SELECT 1 FROM bands
        WHERE bands.id = band_members.band_id
        AND bands.owner_id = auth.uid()
      )
    )
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

CREATE POLICY "Band owner can remove members or member can leave"
  ON band_members FOR DELETE
  USING (
    band_members.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bands
      WHERE bands.id = band_members.band_id
      AND bands.owner_id = auth.uid()
    )
  );

-- =============================================
-- RLS Policies: band_invitations
-- =============================================
CREATE POLICY "Users can view invitations they sent or received"
  ON band_invitations FOR SELECT
  USING (
    inviter_id = auth.uid()
    OR invitee_id = auth.uid()
  );

CREATE POLICY "Band members can send invitations"
  ON band_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = band_invitations.band_id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Invitee can update invitation status"
  ON band_invitations FOR UPDATE
  USING (invitee_id = auth.uid());

CREATE POLICY "Inviter or invitee can delete invitation"
  ON band_invitations FOR DELETE
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- =============================================
-- RLS Policies: setlists
-- =============================================
CREATE POLICY "Users can view own setlists or band setlists"
  ON setlists FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      band_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM band_members
        WHERE band_members.band_id = setlists.band_id
        AND band_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create personal setlists or band setlists"
  ON setlists FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      is_personal = true
      OR (
        band_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM band_members
          WHERE band_members.band_id = setlists.band_id
          AND band_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update own or band setlists"
  ON setlists FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      band_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM band_members
        WHERE band_members.band_id = setlists.band_id
        AND band_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own or band setlists"
  ON setlists FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      band_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM band_members
        WHERE band_members.band_id = setlists.band_id
        AND band_members.user_id = auth.uid()
      )
    )
  );

-- =============================================
-- RLS Policies: setlist_items
-- =============================================
CREATE POLICY "Users can view items of accessible setlists"
  ON setlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND (
        setlists.user_id = auth.uid()
        OR (
          setlists.band_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM band_members
            WHERE band_members.band_id = setlists.band_id
            AND band_members.user_id = auth.uid()
          )
        )
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
        OR (
          setlists.band_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM band_members
            WHERE band_members.band_id = setlists.band_id
            AND band_members.user_id = auth.uid()
          )
        )
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
        OR (
          setlists.band_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM band_members
            WHERE band_members.band_id = setlists.band_id
            AND band_members.user_id = auth.uid()
          )
        )
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
        OR (
          setlists.band_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM band_members
            WHERE band_members.band_id = setlists.band_id
            AND band_members.user_id = auth.uid()
          )
        )
      )
    )
  );
