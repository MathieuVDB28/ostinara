-- Migration: Challenges entre amis
-- Date: 2025-01-07

-- Types ENUM pour les challenges
CREATE TYPE challenge_type AS ENUM ('practice_time', 'streak', 'song_mastery');
CREATE TYPE challenge_status AS ENUM ('pending', 'active', 'completed', 'cancelled', 'declined');

-- Table principale des challenges
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type challenge_type NOT NULL,
  status challenge_status NOT NULL DEFAULT 'pending',

  -- Duree et timing
  duration_days integer NOT NULL CHECK (duration_days >= 1 AND duration_days <= 31),
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,

  -- Pour les challenges song_mastery
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  song_title text,
  song_artist text,
  song_cover_url text,

  -- Resultat
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Contrainte: le createur et le challenger doivent etre differents
  CONSTRAINT different_users CHECK (creator_id != challenger_id)
);

-- Index pour les requetes frequentes
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at) WHERE status = 'active';
CREATE INDEX idx_challenges_created_at ON challenges(created_at DESC);

-- Table de progression des challenges
CREATE TABLE challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metriques de progression
  practice_minutes integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  streak_last_date date,
  song_mastered_at timestamp with time zone,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX idx_challenge_progress_user ON challenge_progress(user_id);

-- Trigger pour mettre a jour updated_at
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

CREATE TRIGGER challenge_progress_updated_at
  BEFORE UPDATE ON challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

-- RLS pour challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les challenges ou ils sont createur ou challenger
CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = challenger_id);

-- Les utilisateurs peuvent creer des challenges
CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Les utilisateurs peuvent modifier les challenges ou ils sont impliques
CREATE POLICY "Users can update their challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = challenger_id);

-- Les utilisateurs peuvent supprimer les challenges qu'ils ont crees (si pending)
CREATE POLICY "Creators can delete pending challenges"
  ON challenges FOR DELETE
  USING (auth.uid() = creator_id AND status = 'pending');

-- RLS pour challenge_progress
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir la progression des challenges auxquels ils participent
CREATE POLICY "Users can view progress for their challenges"
  ON challenge_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_progress.challenge_id
      AND (challenges.creator_id = auth.uid() OR challenges.challenger_id = auth.uid())
    )
  );

-- Les utilisateurs peuvent modifier leur propre progression
CREATE POLICY "Users can update their own progress"
  ON challenge_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert est gere par le service role lors de la creation du challenge
CREATE POLICY "Users can insert progress for their challenges"
  ON challenge_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_progress.challenge_id
      AND (challenges.creator_id = auth.uid() OR challenges.challenger_id = auth.uid())
    )
  );

-- Fonction pour obtenir le leaderboard de pratique entre amis
-- Inclut tous les amis, meme ceux sans sessions (avec 0 minutes)
CREATE OR REPLACE FUNCTION get_practice_leaderboard(
  p_user_id uuid,
  p_period text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  total_minutes bigint,
  sessions_count bigint,
  rank bigint
) AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  -- Calculer la date de debut selon la periode
  IF p_period = 'week' THEN
    start_date := date_trunc('week', now());
  ELSIF p_period = 'month' THEN
    start_date := date_trunc('month', now());
  ELSE
    start_date := date_trunc('week', now());
  END IF;

  RETURN QUERY
  WITH friend_ids AS (
    -- Obtenir tous les IDs d'amis
    SELECT CASE
      WHEN requester_id = p_user_id THEN addressee_id
      ELSE requester_id
    END as friend_id
    FROM friendships
    WHERE status = 'accepted'
    AND (requester_id = p_user_id OR addressee_id = p_user_id)
  ),
  user_and_friends AS (
    -- Inclure l'utilisateur et tous ses amis
    SELECT p_user_id as uid
    UNION
    SELECT friend_id FROM friend_ids
  ),
  practice_data AS (
    -- Calculer les stats pour ceux qui ont des sessions
    SELECT
      ps.user_id as puser_id,
      COALESCE(SUM(ps.duration_minutes), 0) as total_mins,
      COUNT(*) as sess_count
    FROM practice_sessions ps
    WHERE ps.user_id IN (SELECT uid FROM user_and_friends)
    AND ps.practiced_at >= start_date
    GROUP BY ps.user_id
  ),
  all_users_with_stats AS (
    -- Joindre tous les utilisateurs avec leurs stats (0 si pas de sessions)
    SELECT
      uaf.uid as user_id,
      COALESCE(pd.total_mins, 0) as total_minutes,
      COALESCE(pd.sess_count, 0) as sessions_count
    FROM user_and_friends uaf
    LEFT JOIN practice_data pd ON uaf.uid = pd.puser_id
  )
  SELECT
    aus.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    aus.total_minutes,
    aus.sessions_count,
    ROW_NUMBER() OVER (ORDER BY aus.total_minutes DESC, p.username ASC) as rank
  FROM all_users_with_stats aus
  JOIN profiles p ON aus.user_id = p.id
  ORDER BY aus.total_minutes DESC, p.username ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter les nouveaux types d'activites
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'challenge_created';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'challenge_accepted';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'challenge_completed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'challenge_won';
