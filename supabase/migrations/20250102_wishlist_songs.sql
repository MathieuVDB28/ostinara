-- Migration: Wishlist Songs Table
-- Description: Table pour stocker les morceaux que l'utilisateur veut apprendre plus tard

-- Create wishlist_songs table
CREATE TABLE IF NOT EXISTS wishlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  cover_url text,
  spotify_id text,
  preview_url text,
  created_at timestamp with time zone DEFAULT now(),

  -- Prevent duplicate songs in the same user's wishlist
  UNIQUE(user_id, spotify_id)
);

-- Enable Row Level Security
ALTER TABLE wishlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own wishlist"
  ON wishlist_songs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own wishlist"
  ON wishlist_songs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own wishlist"
  ON wishlist_songs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for friends to view wishlist activities (for feed)
CREATE POLICY "Friends can view wishlist songs"
  ON wishlist_songs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = wishlist_songs.user_id)
        OR (addressee_id = auth.uid() AND requester_id = wishlist_songs.user_id)
      )
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_songs_user_id ON wishlist_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_songs_created_at ON wishlist_songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_songs_spotify_id ON wishlist_songs(spotify_id);
