-- Migration: le repertoire du groupe (F5)
--
-- Une fiche par morceau, au niveau du groupe : tonalite, tempo, accordage,
-- structure, liens, notes communes, et une note par musicien sur son poste.
-- Elle donne les valeurs par defaut ; une ligne de setlist peut les surcharger
-- pour un concert (tempo, sections, lien de tab).
--
-- Un morceau entre dans le repertoire des qu'il est ajoute a une setlist du
-- groupe (trigger), ou a la main. Les setlists existantes le remplissent ici.
--
-- Tout membre lit, meme en lecture seule ; tout membre d'un groupe actif ecrit.

CREATE TABLE IF NOT EXISTS band_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  -- Titre + artiste normalises (song_match_key) : un morceau par groupe.
  song_key TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  artist TEXT CHECK (char_length(artist) <= 300),
  cover_url TEXT,
  deezer_id TEXT,
  -- Tonalite : 0 = do ... 11 = si ; le mode a part.
  key_note SMALLINT CHECK (key_note BETWEEN 0 AND 11),
  key_mode TEXT CHECK (key_mode IN ('major', 'minor')),
  bpm INTEGER CHECK (bpm BETWEEN 20 AND 300),
  tuning TEXT CHECK (char_length(tuning) <= 60),
  capo SMALLINT CHECK (capo BETWEEN 0 AND 12),
  -- Meme forme que setlist_items.played_sections : [{name, startMeasure, endMeasure}].
  structure JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(structure) = 'array'),
  notes TEXT CHECK (char_length(notes) <= 4000),
  tabs_url TEXT CHECK (char_length(tabs_url) <= 2000),
  reference_url TEXT CHECK (char_length(reference_url) <= 2000),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (band_id, song_key)
);

CREATE INDEX IF NOT EXISTS band_songs_band_idx ON band_songs (band_id, title);

-- La note de chacun sur son poste : une par musicien et par morceau.
CREATE TABLE IF NOT EXISTS band_song_notes (
  band_song_id UUID NOT NULL REFERENCES band_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (band_song_id, user_id)
);

ALTER TABLE setlist_items
  ADD COLUMN IF NOT EXISTS band_song_id UUID REFERENCES band_songs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS setlist_items_band_song_idx
  ON setlist_items (band_song_id)
  WHERE band_song_id IS NOT NULL;

-- === Qui a touche la fiche, et quand ===
CREATE OR REPLACE FUNCTION touch_band_song()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  -- La cle suit le titre et l'artiste ; on ne change pas de groupe.
  NEW.song_key := song_match_key(NEW.title, NEW.artist);
  IF TG_OP = 'UPDATE' THEN
    NEW.band_id := OLD.band_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
  END IF;
  IF NEW.song_key IS NULL THEN
    RAISE EXCEPTION 'Titre requis';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_band_song ON band_songs;
CREATE TRIGGER touch_band_song
  BEFORE INSERT OR UPDATE ON band_songs
  FOR EACH ROW EXECUTE FUNCTION touch_band_song();

CREATE OR REPLACE FUNCTION touch_band_song_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_band_song_note ON band_song_notes;
CREATE TRIGGER touch_band_song_note
  BEFORE INSERT OR UPDATE ON band_song_notes
  FOR EACH ROW EXECUTE FUNCTION touch_band_song_note();

-- === Droits ===
ALTER TABLE band_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members read band songs" ON band_songs;
CREATE POLICY "Band members read band songs"
  ON band_songs FOR SELECT
  TO authenticated
  USING (is_band_member(band_id, auth.uid()));

DROP POLICY IF EXISTS "Band members write band songs" ON band_songs;
CREATE POLICY "Band members write band songs"
  ON band_songs FOR ALL
  TO authenticated
  USING (is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
  WITH CHECK (is_band_member(band_id, auth.uid()) AND band_is_active(band_id));

CREATE OR REPLACE FUNCTION band_song_band(p_band_song_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT band_id FROM band_songs WHERE id = p_band_song_id;
$$;

DROP POLICY IF EXISTS "Band members read band song notes" ON band_song_notes;
CREATE POLICY "Band members read band song notes"
  ON band_song_notes FOR SELECT
  TO authenticated
  USING (is_band_member(band_song_band(band_song_id), auth.uid()));

-- Sa note n'appartient qu'a soi.
DROP POLICY IF EXISTS "Members write their own band song note" ON band_song_notes;
CREATE POLICY "Members write their own band song note"
  ON band_song_notes FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_band_member(band_song_band(band_song_id), auth.uid())
    AND band_is_active(band_song_band(band_song_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(band_song_band(band_song_id), auth.uid())
    AND band_is_active(band_song_band(band_song_id))
  );

-- === Une ligne de setlist de groupe entre dans le repertoire ===
-- SECURITY DEFINER : la fiche reprend le deezer_id, l'accordage et le capo du
-- morceau du membre, que les autres ne lisent pas forcement. Rien d'autre ne
-- sort de sa biblio. Les droits d'ecriture sur la setlist ont deja ete verifies
-- par la policy de setlist_items.
CREATE OR REPLACE FUNCTION link_setlist_item_to_band_song()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band UUID;
  v_title TEXT;
  v_artist TEXT;
  v_key TEXT;
  v_song RECORD;
  v_id UUID;
BEGIN
  IF NEW.item_type <> 'song' THEN
    RETURN NEW;
  END IF;

  SELECT band_id INTO v_band FROM setlists WHERE id = NEW.setlist_id;
  IF v_band IS NULL THEN
    RETURN NEW;
  END IF;

  -- Une fiche choisie a la main doit etre celle du groupe.
  IF NEW.band_song_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM band_songs WHERE id = NEW.band_song_id AND band_id = v_band) THEN
      NEW.band_song_id := NULL;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT id, title, artist, deezer_id, tuning, capo_position
    INTO v_song
    FROM songs
   WHERE id = NEW.song_id;

  v_title := COALESCE(NEW.song_title, v_song.title);
  v_artist := COALESCE(NEW.song_artist, v_song.artist);
  v_key := song_match_key(v_title, v_artist);
  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_id FROM band_songs WHERE band_id = v_band AND song_key = v_key;

  IF v_id IS NULL THEN
    INSERT INTO band_songs (
      band_id, song_key, title, artist, cover_url, deezer_id, bpm, tuning, capo, structure, tabs_url
    )
    VALUES (
      v_band, v_key, left(v_title, 300), left(v_artist, 300), NEW.song_cover_url, v_song.deezer_id,
      CASE WHEN NEW.bpm BETWEEN 20 AND 300 THEN NEW.bpm END,
      CASE WHEN v_song.tuning IS NOT NULL AND lower(v_song.tuning) <> 'standard' THEN left(v_song.tuning, 60) END,
      CASE WHEN v_song.capo_position BETWEEN 1 AND 12 THEN v_song.capo_position END,
      CASE WHEN jsonb_typeof(NEW.played_sections) = 'array' THEN NEW.played_sections ELSE '[]'::jsonb END,
      NEW.tabs_url
    )
    ON CONFLICT (band_id, song_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM band_songs WHERE band_id = v_band AND song_key = v_key;
    END IF;
  END IF;

  NEW.band_song_id := v_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_setlist_item_to_band_song ON setlist_items;
CREATE TRIGGER link_setlist_item_to_band_song
  BEFORE INSERT ON setlist_items
  FOR EACH ROW EXECUTE FUNCTION link_setlist_item_to_band_song();

-- === Les setlists de groupe existantes remplissent le repertoire ===
-- La ligne la plus recente donne les valeurs par defaut.
WITH lines AS (
  SELECT DISTINCT ON (s.band_id, song_match_key(COALESCE(i.song_title, ref.title), COALESCE(i.song_artist, ref.artist)))
    s.band_id,
    song_match_key(COALESCE(i.song_title, ref.title), COALESCE(i.song_artist, ref.artist)) AS song_key,
    COALESCE(i.song_title, ref.title) AS title,
    COALESCE(i.song_artist, ref.artist) AS artist,
    COALESCE(i.song_cover_url, ref.cover_url) AS cover_url,
    ref.deezer_id,
    i.bpm,
    ref.tuning,
    ref.capo_position,
    i.played_sections,
    i.tabs_url,
    s.user_id
  FROM setlist_items i
  JOIN setlists s ON s.id = i.setlist_id
  LEFT JOIN songs ref ON ref.id = i.song_id
  WHERE s.band_id IS NOT NULL
    AND i.item_type = 'song'
    AND song_match_key(COALESCE(i.song_title, ref.title), COALESCE(i.song_artist, ref.artist)) IS NOT NULL
  ORDER BY s.band_id, song_match_key(COALESCE(i.song_title, ref.title), COALESCE(i.song_artist, ref.artist)),
           i.updated_at DESC NULLS LAST
)
INSERT INTO band_songs (
  band_id, song_key, title, artist, cover_url, deezer_id, bpm, tuning, capo, structure, tabs_url, created_by, updated_by
)
SELECT
  band_id, song_key, left(title, 300), left(artist, 300), cover_url, deezer_id,
  CASE WHEN bpm BETWEEN 20 AND 300 THEN bpm END,
  CASE WHEN tuning IS NOT NULL AND lower(tuning) <> 'standard' THEN left(tuning, 60) END,
  CASE WHEN capo_position BETWEEN 1 AND 12 THEN capo_position END,
  CASE WHEN jsonb_typeof(played_sections) = 'array' THEN played_sections ELSE '[]'::jsonb END,
  tabs_url, user_id, user_id
FROM lines
ON CONFLICT (band_id, song_key) DO NOTHING;

UPDATE setlist_items i
   SET band_song_id = b.id
  FROM setlists s, band_songs b
 WHERE s.id = i.setlist_id
   AND s.band_id IS NOT NULL
   AND i.item_type = 'song'
   AND i.band_song_id IS NULL
   AND b.band_id = s.band_id
   AND b.song_key = song_match_key(
         COALESCE(i.song_title, (SELECT title FROM songs WHERE id = i.song_id)),
         COALESCE(i.song_artist, (SELECT artist FROM songs WHERE id = i.song_id))
       );

-- === Ou en est chaque musicien sur un morceau du repertoire ===
-- Comme get_setlist_member_readiness, pour une fiche : le statut et la
-- progression de chaque membre sur le poste qu'il tient, rien d'autre.
CREATE OR REPLACE FUNCTION get_band_song_readiness(p_band_song_id UUID)
RETURNS TABLE (
  user_id UUID,
  in_library BOOLEAN,
  status song_status,
  progress_percent INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fiche AS (
    SELECT b.band_id, b.song_key, b.deezer_id
      FROM band_songs b
     WHERE b.id = p_band_song_id
       AND is_band_member(b.band_id, auth.uid())
  ),
  members AS (
    SELECT m.user_id, COALESCE(m.instrument, primary_instrument(m.user_id)) AS instrument
      FROM band_members m
      JOIN fiche ON fiche.band_id = m.band_id
  )
  SELECT
    m.user_id,
    found.id IS NOT NULL,
    found.status,
    found.progress_percent
  FROM members m
  CROSS JOIN fiche f
  LEFT JOIN LATERAL (
    SELECT
      s.id,
      COALESCE(part.status, 'want_to_learn'::song_status) AS status,
      COALESCE(part.progress_percent, 0) AS progress_percent
    FROM songs s
    LEFT JOIN song_parts part ON part.song_id = s.id AND part.instrument = m.instrument
    WHERE s.user_id = m.user_id
      AND (
        (f.deezer_id IS NOT NULL AND s.deezer_id = f.deezer_id)
        OR song_match_key(s.title, s.artist) = f.song_key
      )
    ORDER BY 2 DESC, 3 DESC
    LIMIT 1
  ) found ON TRUE;
$$;

REVOKE ALL ON FUNCTION get_band_song_readiness(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_band_song_readiness(UUID) TO authenticated;
