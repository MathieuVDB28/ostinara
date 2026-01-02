-- Migration: Practice Sessions
-- Description: Ajouter le journal de pratique avec historique

-- Types enum pour les sessions de pratique
DO $$ BEGIN
    CREATE TYPE session_mood AS ENUM ('frustrated', 'neutral', 'good', 'great', 'on_fire');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE song_section AS ENUM ('intro', 'verse', 'chorus', 'bridge', 'solo', 'outro', 'full_song');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table practice_sessions
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,

    -- Timing
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Performance
    bpm_achieved INTEGER CHECK (bpm_achieved IS NULL OR (bpm_achieved > 0 AND bpm_achieved <= 300)),

    -- Feeling
    mood session_mood,
    energy_level energy_level,

    -- Sections travaillées (array de sections)
    sections_worked song_section[] DEFAULT '{}',

    -- Objectifs
    session_goals TEXT,
    goals_achieved BOOLEAN DEFAULT FALSE,

    -- Notes libres
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS practice_sessions_user_id_idx ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS practice_sessions_song_id_idx ON practice_sessions(song_id);
CREATE INDEX IF NOT EXISTS practice_sessions_practiced_at_idx ON practice_sessions(practiced_at DESC);
CREATE INDEX IF NOT EXISTS practice_sessions_user_date_idx ON practice_sessions(user_id, practiced_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_practice_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER update_practice_sessions_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_practice_sessions_updated_at();

-- RLS Policies
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view own practice sessions
DROP POLICY IF EXISTS "Users can view own practice sessions" ON practice_sessions;
CREATE POLICY "Users can view own practice sessions"
    ON practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert own practice sessions
DROP POLICY IF EXISTS "Users can insert own practice sessions" ON practice_sessions;
CREATE POLICY "Users can insert own practice sessions"
    ON practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update own practice sessions
DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;
CREATE POLICY "Users can update own practice sessions"
    ON practice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete own practice sessions
DROP POLICY IF EXISTS "Users can delete own practice sessions" ON practice_sessions;
CREATE POLICY "Users can delete own practice sessions"
    ON practice_sessions FOR DELETE
    USING (auth.uid() = user_id);
