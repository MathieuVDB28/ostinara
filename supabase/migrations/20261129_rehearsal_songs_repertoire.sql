-- Migration: les morceaux d'un compte rendu de repete entrent au repertoire
--
-- Comme une ligne de setlist de groupe (20261128), un morceau joue en repete
-- cree sa fiche dans le repertoire du groupe s'il n'y est pas encore.
-- save_rehearsal_log remplace tous les morceaux a chaque enregistrement :
-- seuls ceux qui n'y etaient pas encore sont envoyes au repertoire, pour
-- qu'une fiche supprimee expres ne revienne pas a la correction suivante.
--
-- Les comptes rendus deja enregistres remplissent le repertoire ici.
--
-- Depend de 20261127_rehearsal_log_fixes et 20261128_band_repertoire.

-- Sans SECURITY DEFINER : chaque ecriture repasse par les policies.
-- Renvoie qui prevenir, ou `conflict` si la repete a change depuis
-- `p_expected_updated_at` (rien n'est alors ecrit).
CREATE OR REPLACE FUNCTION save_rehearsal_log(
  p_rehearsal_id UUID,
  p_band_id UUID,
  p_title TEXT,
  p_date TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_location TEXT,
  p_setlist_id UUID,
  p_notes TEXT,
  p_attendee_ids UUID[],
  p_songs JSONB,
  p_tasks JSONB,
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID := p_rehearsal_id;
  v_created BOOLEAN := p_rehearsal_id IS NULL;
  v_new_attendees UUID[];
  v_new_tasks JSONB := '[]'::jsonb;
  v_task JSONB;
  v_task_id UUID;
  v_assignee UUID;
  v_previous UUID;
  v_updated_at TIMESTAMPTZ;
  v_updated_by UUID;
  v_previous_keys TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  IF p_date > now() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Repete dans le futur';
  END IF;

  IF p_setlist_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM setlists WHERE id = p_setlist_id AND band_id = p_band_id
  ) THEN
    RAISE EXCEPTION 'Setlist hors du groupe';
  END IF;

  IF v_created THEN
    INSERT INTO rehearsals (
      band_id, created_by, title, date, duration_minutes, location, setlist_id, notes,
      status, logged_at, logged_by
    )
    VALUES (
      p_band_id, v_uid, p_title, p_date, p_duration_minutes, p_location, p_setlist_id, p_notes,
      'completed', now(), v_uid
    )
    RETURNING id INTO v_id;
  ELSE
    -- Le verrou garde la verification et l'ecriture ensemble.
    SELECT updated_at, updated_by INTO v_updated_at, v_updated_by
      FROM rehearsals
     WHERE id = v_id AND band_id = p_band_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Repete introuvable';
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RETURN jsonb_build_object('id', v_id, 'conflict', true, 'updated_by', v_updated_by);
    END IF;

    UPDATE rehearsals
       SET title = p_title,
           date = p_date,
           duration_minutes = p_duration_minutes,
           location = p_location,
           setlist_id = p_setlist_id,
           notes = p_notes,
           status = 'completed',
           logged_at = COALESCE(logged_at, now()),
           logged_by = COALESCE(logged_by, v_uid)
     WHERE id = v_id AND band_id = p_band_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Repete introuvable';
    END IF;
  END IF;

  -- Les presents : on retire qui n'est plus coche (sauf s'il a confirme), on
  -- ajoute les nouveaux avec leur poste, et seuls des membres du groupe entrent.
  DELETE FROM rehearsal_attendees
   WHERE rehearsal_id = v_id
     AND status <> 'confirmed'
     AND NOT (user_id = ANY (p_attendee_ids));

  WITH inserted AS (
    INSERT INTO rehearsal_attendees (rehearsal_id, user_id, instrument, instrument_label, tagged_by)
    SELECT v_id, m.user_id, m.instrument, m.instrument_label, v_uid
      FROM band_members m
     WHERE m.band_id = p_band_id
       AND m.user_id = ANY (p_attendee_ids)
    ON CONFLICT (rehearsal_id, user_id) DO NOTHING
    RETURNING user_id
  )
  SELECT COALESCE(array_agg(user_id), '{}') INTO v_new_attendees FROM inserted;

  -- Les morceaux : rien d'autre ne pointe vers ces lignes, on les remplace.
  -- On note d'abord ceux qui y etaient, pour n'envoyer au repertoire que les nouveaux.
  SELECT COALESCE(array_agg(song_match_key(song_title, song_artist)), '{}')
    INTO v_previous_keys
    FROM rehearsal_songs
   WHERE rehearsal_id = v_id;

  DELETE FROM rehearsal_songs WHERE rehearsal_id = v_id;

  INSERT INTO rehearsal_songs (
    rehearsal_id, position, song_key, setlist_item_id, song_title, song_artist, song_cover_url, deezer_id, verdict
  )
  SELECT
    v_id,
    song.ordinality - 1,
    song.value->>'song_key',
    (
      SELECT i.id
        FROM setlist_items i
        JOIN setlists s ON s.id = i.setlist_id
       WHERE i.id = NULLIF(song.value->>'setlist_item_id', '')::uuid
         AND s.band_id = p_band_id
    ),
    song.value->>'title',
    NULLIF(song.value->>'artist', ''),
    NULLIF(song.value->>'cover_url', ''),
    NULLIF(song.value->>'deezer_id', ''),
    NULLIF(song.value->>'verdict', '')
  FROM jsonb_array_elements(p_songs) WITH ORDINALITY AS song(value, ordinality);

  -- Un morceau qui entre dans le compte rendu entre aussi dans le repertoire
  -- (comme une ligne de setlist de groupe). Une fiche supprimee expres ne
  -- revient pas quand on corrige le compte rendu sans toucher a ce morceau.
  INSERT INTO band_songs (band_id, song_key, title, artist, cover_url, deezer_id)
  SELECT DISTINCT ON (song_match_key(r.song_title, r.song_artist))
    p_band_id,
    song_match_key(r.song_title, r.song_artist),
    left(r.song_title, 300),
    left(r.song_artist, 300),
    r.song_cover_url,
    r.deezer_id
  FROM rehearsal_songs r
  WHERE r.rehearsal_id = v_id
    AND song_match_key(r.song_title, r.song_artist) IS NOT NULL
    AND NOT (song_match_key(r.song_title, r.song_artist) = ANY (v_previous_keys))
  ORDER BY song_match_key(r.song_title, r.song_artist), r.position
  ON CONFLICT (band_id, song_key) DO NOTHING;

  -- Les points a bosser : les coches restent, les autres suivent le formulaire.
  DELETE FROM rehearsal_tasks
   WHERE rehearsal_id = v_id
     AND done_at IS NULL
     AND id NOT IN (
       SELECT (task->>'id')::uuid
         FROM jsonb_array_elements(p_tasks) AS task
        WHERE NULLIF(task->>'id', '') IS NOT NULL
     );

  FOR v_task IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
    v_task_id := NULLIF(v_task->>'id', '')::uuid;
    v_assignee := NULLIF(v_task->>'assignee_id', '')::uuid;

    IF v_task_id IS NOT NULL THEN
      SELECT assignee_id INTO v_previous
        FROM rehearsal_tasks
       WHERE id = v_task_id AND rehearsal_id = v_id;

      IF FOUND THEN
        UPDATE rehearsal_tasks
           SET content = v_task->>'content', assignee_id = v_assignee
         WHERE id = v_task_id;

        IF v_assignee IS NOT NULL AND v_assignee IS DISTINCT FROM v_previous THEN
          v_new_tasks := v_new_tasks || jsonb_build_object('assignee_id', v_assignee, 'content', v_task->>'content');
        END IF;
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO rehearsal_tasks (band_id, rehearsal_id, assignee_id, content, created_by)
    VALUES (p_band_id, v_id, v_assignee, v_task->>'content', v_uid);

    IF v_assignee IS NOT NULL THEN
      v_new_tasks := v_new_tasks || jsonb_build_object('assignee_id', v_assignee, 'content', v_task->>'content');
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_id,
    'created', v_created,
    'new_attendees', to_jsonb(v_new_attendees),
    'new_tasks', v_new_tasks
  );
END;
$$;

REVOKE ALL ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB, TIMESTAMPTZ) TO authenticated;

-- === Les comptes rendus existants remplissent le repertoire ===
-- Le morceau le plus recent donne la pochette et l'identifiant Deezer.
INSERT INTO band_songs (band_id, song_key, title, artist, cover_url, deezer_id, created_by, updated_by)
SELECT DISTINCT ON (h.band_id, song_match_key(r.song_title, r.song_artist))
  h.band_id,
  song_match_key(r.song_title, r.song_artist),
  left(r.song_title, 300),
  left(r.song_artist, 300),
  r.song_cover_url,
  r.deezer_id,
  COALESCE(h.logged_by, h.created_by),
  COALESCE(h.logged_by, h.created_by)
FROM rehearsal_songs r
JOIN rehearsals h ON h.id = r.rehearsal_id
WHERE song_match_key(r.song_title, r.song_artist) IS NOT NULL
ORDER BY h.band_id, song_match_key(r.song_title, r.song_artist), h.date DESC, r.position
ON CONFLICT (band_id, song_key) DO NOTHING;
