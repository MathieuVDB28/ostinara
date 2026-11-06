-- Migration: « Prets pour la repete » : ou en est chaque musicien sur la setlist
--
-- songs et song_parts ne se lisent qu'entre amis, et deux membres d'un groupe
-- ne le sont pas forcement. Cette fonction ouvre juste ce qu'il faut : le statut
-- et la progression de chaque membre, sur le poste qu'il tient dans le groupe,
-- pour les morceaux de la setlist et rien d'autre de sa biblio.

-- « Déjà Vu » et « deja vu » sont le meme morceau, dans la biblio de chacun.
-- Null sans titre exploitable : deux titres vides ne se ressemblent pas.
CREATE OR REPLACE FUNCTION song_match_key(p_title TEXT, p_artist TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT
      btrim(regexp_replace(regexp_replace(lower(normalize(COALESCE(p_title, ''), NFD)),
        '[̀-ͯ]', '', 'g'), '[[:space:][:punct:] -¿‐-⁯]+', ' ', 'g')) AS title,
      btrim(regexp_replace(regexp_replace(lower(normalize(COALESCE(p_artist, ''), NFD)),
        '[̀-ͯ]', '', 'g'), '[[:space:][:punct:] -¿‐-⁯]+', ' ', 'g')) AS artist
  )
  SELECT CASE WHEN title = '' THEN NULL ELSE title || '|' || artist END FROM normalized;
$$;

CREATE OR REPLACE FUNCTION get_setlist_member_readiness(p_setlist_id UUID)
RETURNS TABLE (
  item_id UUID,
  user_id UUID,
  in_library BOOLEAN,
  status song_status,
  progress_percent INTEGER,
  -- Remplis sur la ligne de celui qui appelle : de quoi changer son statut.
  my_song_id UUID,
  my_deezer_id TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH band AS (
    -- La lecture reste ouverte a un groupe en lecture seule : pas de band_is_active.
    SELECT s.band_id
      FROM setlists s
     WHERE s.id = p_setlist_id
       AND s.band_id IS NOT NULL
       AND is_band_member(s.band_id, auth.uid())
  ),
  items AS (
    SELECT
      i.id,
      i.song_id,
      ref.deezer_id,
      song_match_key(COALESCE(i.song_title, ref.title), COALESCE(i.song_artist, ref.artist)) AS song_key
    FROM setlist_items i
    LEFT JOIN songs ref ON ref.id = i.song_id
    WHERE i.setlist_id = p_setlist_id
      AND i.item_type = 'song'
      AND EXISTS (SELECT 1 FROM band)
  ),
  members AS (
    SELECT m.user_id, COALESCE(m.instrument, primary_instrument(m.user_id)) AS instrument
      FROM band_members m
      JOIN band ON band.band_id = m.band_id
  )
  SELECT
    i.id,
    m.user_id,
    found.id IS NOT NULL,
    found.status,
    found.progress_percent,
    CASE WHEN m.user_id = auth.uid() THEN found.id END,
    CASE WHEN m.user_id = auth.uid() THEN i.deezer_id END
  FROM items i
  CROSS JOIN members m
  LEFT JOIN LATERAL (
    -- Un morceau en double dans une biblio : on garde le plus avance.
    SELECT
      s.id,
      COALESCE(part.status, 'want_to_learn'::song_status) AS status,
      COALESCE(part.progress_percent, 0) AS progress_percent
    FROM songs s
    LEFT JOIN song_parts part ON part.song_id = s.id AND part.instrument = m.instrument
    WHERE s.user_id = m.user_id
      AND (
        s.id = i.song_id
        OR (i.deezer_id IS NOT NULL AND s.deezer_id = i.deezer_id)
        OR song_match_key(s.title, s.artist) = i.song_key
      )
    ORDER BY 2 DESC, 3 DESC
    LIMIT 1
  ) found ON TRUE;
$$;

REVOKE ALL ON FUNCTION get_setlist_member_readiness(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_setlist_member_readiness(UUID) TO authenticated;
