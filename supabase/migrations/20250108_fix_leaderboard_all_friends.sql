-- Fix: Afficher tous les amis dans le leaderboard, meme ceux sans sessions
-- Date: 2025-01-08

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
