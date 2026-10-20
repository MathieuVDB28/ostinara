-- Migration: les chiffres de pratique sur le profil d'un ami
--
-- practice_sessions n'est lisible que par son proprietaire : sur le profil
-- d'un ami, « Cette semaine / Total / Sessions » restait vide. On n'ouvre
-- pas la table (notes, morceaux, sessions non partagees) : cette fonction
-- ne rend que la date et la duree de chaque ligne, a ceux qui voient deja
-- le contenu du profil (soi, ses amis, tout le monde si le profil est
-- public — cf. canViewPrivateContent dans getPublicProfile).
--
-- Le detail des sessions, lui, se lit dans les activites `session_completed`
-- (feed) : il respecte la case « Partager avec mes amis ».

CREATE OR REPLACE FUNCTION get_profile_practice_days(p_user_id UUID)
RETURNS TABLE (practiced_at TIMESTAMPTZ, duration_minutes INTEGER, session_key UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.practiced_at, ps.duration_minutes, COALESCE(ps.session_group_id, ps.id)
  FROM practice_sessions ps
  WHERE ps.user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = p_user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = p_user_id)
          )
      )
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = p_user_id AND p.is_private IS NOT TRUE)
    )
  ORDER BY ps.practiced_at DESC;
$$;

REVOKE ALL ON FUNCTION get_profile_practice_days(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_profile_practice_days(UUID) TO anon, authenticated;
