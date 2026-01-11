-- =============================================
-- Migration: Jam Sessions (Collaborative)
-- Date: 2025-01-12
-- Description: Tables pour les sessions jam collaboratives
-- =============================================

-- =============================================
-- Types enum
-- =============================================
CREATE TYPE jam_session_status AS ENUM ('waiting', 'active', 'paused', 'ended');

-- =============================================
-- Table: jam_sessions
-- =============================================
CREATE TABLE IF NOT EXISTS jam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setlist_id UUID REFERENCES setlists(id) ON DELETE SET NULL,
  status jam_session_status NOT NULL DEFAULT 'waiting',

  -- Metronome state (synced)
  bpm INTEGER NOT NULL DEFAULT 120,
  time_signature_beats INTEGER NOT NULL DEFAULT 4,
  time_signature_value INTEGER NOT NULL DEFAULT 4,
  is_metronome_playing BOOLEAN NOT NULL DEFAULT false,

  -- Current song from setlist
  current_song_index INTEGER,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  current_song_title TEXT,
  current_song_artist TEXT,

  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jam_sessions_band_idx ON jam_sessions(band_id);
CREATE INDEX IF NOT EXISTS jam_sessions_host_idx ON jam_sessions(host_id);
CREATE INDEX IF NOT EXISTS jam_sessions_status_idx ON jam_sessions(status);

-- =============================================
-- Table: jam_session_participants
-- =============================================
CREATE TABLE IF NOT EXISTS jam_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES jam_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT unique_session_participant UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS jam_participants_session_idx ON jam_session_participants(session_id);
CREATE INDEX IF NOT EXISTS jam_participants_user_idx ON jam_session_participants(user_id);
CREATE INDEX IF NOT EXISTS jam_participants_active_idx ON jam_session_participants(is_active);

-- =============================================
-- Table: jam_session_messages (Chat)
-- =============================================
CREATE TABLE IF NOT EXISTS jam_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES jam_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jam_messages_session_idx ON jam_session_messages(session_id);
CREATE INDEX IF NOT EXISTS jam_messages_created_idx ON jam_session_messages(created_at);

-- =============================================
-- Triggers: updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_jam_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jam_sessions_updated_at
  BEFORE UPDATE ON jam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_jam_sessions_updated_at();

-- =============================================
-- RLS: Enable
-- =============================================
ALTER TABLE jam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jam_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE jam_session_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper Functions (SECURITY DEFINER to avoid RLS recursion)
-- =============================================
CREATE OR REPLACE FUNCTION is_jam_session_band_member(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM jam_sessions js
    JOIN band_members bm ON bm.band_id = js.band_id
    WHERE js.id = p_session_id
    AND bm.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_jam_session_participant(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM jam_session_participants
    WHERE session_id = p_session_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS Policies: jam_sessions
-- =============================================
CREATE POLICY "Band members can view jam sessions"
  ON jam_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = jam_sessions.band_id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can create jam sessions"
  ON jam_sessions FOR INSERT
  WITH CHECK (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = jam_sessions.band_id
      AND band_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.plan = 'band'
    )
  );

CREATE POLICY "Band members can update jam session"
  ON jam_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = jam_sessions.band_id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Host can delete jam session"
  ON jam_sessions FOR DELETE
  USING (host_id = auth.uid());

-- =============================================
-- RLS Policies: jam_session_participants
-- =============================================
CREATE POLICY "Band members can view session participants"
  ON jam_session_participants FOR SELECT
  USING (is_jam_session_band_member(session_id, auth.uid()));

CREATE POLICY "Band members can join session"
  ON jam_session_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_jam_session_band_member(session_id, auth.uid())
  );

CREATE POLICY "Participants can update their own record"
  ON jam_session_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Participants can leave"
  ON jam_session_participants FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- RLS Policies: jam_session_messages
-- =============================================
CREATE POLICY "Participants can view messages"
  ON jam_session_messages FOR SELECT
  USING (is_jam_session_band_member(session_id, auth.uid()));

CREATE POLICY "Active participants can send messages"
  ON jam_session_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_jam_session_participant(session_id, auth.uid())
  );

-- =============================================
-- Enable Realtime for tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE jam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE jam_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE jam_session_messages;
