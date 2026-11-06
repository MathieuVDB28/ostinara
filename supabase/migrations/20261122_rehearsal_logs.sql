-- Migration: raconter une repete
--
-- Une repete planifiee, ou une repete sortie de nulle part, recoit un compte
-- rendu : duree, presents, morceaux avec un verdict, points a bosser. C'est la
-- meme ligne de `rehearsals` : `logged_at` dit que le compte rendu existe.
--
-- Ecrire dans les statistiques de quelqu'un demande son accord : etre tague
-- cree une ligne « pending » dans `rehearsal_attendees`, et c'est le musicien
-- qui confirme. Sa confirmation cree une session a lui, reliee par
-- `practice_sessions.rehearsal_id` : heures, serie, defis et badges suivent
-- sans cas particulier.
--
-- Effacer la repete ne touche pas aux sessions (le temps a bien ete joue).
-- Effacer sa session remet sa presence « pending », et retire son activite.

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'rehearsal_logged';

ALTER TABLE rehearsals
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER CHECK (duration_minutes BETWEEN 1 AND 1440),
  ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logged_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS rehearsals_band_logged_idx
  ON rehearsals (band_id, date DESC)
  WHERE logged_at IS NOT NULL;

ALTER TABLE practice_sessions
  ADD COLUMN IF NOT EXISTS rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practice_sessions_rehearsal_idx
  ON practice_sessions (rehearsal_id)
  WHERE rehearsal_id IS NOT NULL;

-- === Qui y etait ===
-- A cote de `rehearsal_participants`, qui dit qui comptait venir.
CREATE TABLE IF NOT EXISTS rehearsal_attendees (
  rehearsal_id UUID NOT NULL REFERENCES rehearsals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Le poste dans le groupe au moment de la repete : la valeur proposee.
  instrument instrument,
  instrument_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  tagged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rehearsal_id, user_id)
);

CREATE INDEX IF NOT EXISTS rehearsal_attendees_pending_idx
  ON rehearsal_attendees (user_id)
  WHERE status = 'pending';

-- === Ce qui a ete joue ===
-- `song_key` (titre + artiste normalises) retrouve un morceau d'une repete a
-- l'autre quand il ne vient pas de la meme ligne de setlist.
CREATE TABLE IF NOT EXISTS rehearsal_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES rehearsals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  song_key TEXT NOT NULL,
  setlist_item_id UUID REFERENCES setlist_items(id) ON DELETE SET NULL,
  song_title TEXT NOT NULL CHECK (char_length(song_title) BETWEEN 1 AND 300),
  song_artist TEXT,
  song_cover_url TEXT,
  deezer_id TEXT,
  verdict TEXT CHECK (verdict IN ('rework', 'solid', 'ready')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rehearsal_id, song_key)
);

CREATE INDEX IF NOT EXISTS rehearsal_songs_item_idx
  ON rehearsal_songs (setlist_item_id)
  WHERE setlist_item_id IS NOT NULL;

-- === Ce qu'il reste a bosser ===
CREATE TABLE IF NOT EXISTS rehearsal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  rehearsal_id UUID NOT NULL REFERENCES rehearsals(id) ON DELETE CASCADE,
  -- Null : c'est pour tout le groupe.
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehearsal_tasks_open_idx
  ON rehearsal_tasks (band_id, created_at)
  WHERE done_at IS NULL;

CREATE INDEX IF NOT EXISTS rehearsal_tasks_rehearsal_idx ON rehearsal_tasks (rehearsal_id);

-- === Droits ===
ALTER TABLE rehearsal_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members read rehearsal attendees" ON rehearsal_attendees;
CREATE POLICY "Band members read rehearsal attendees"
  ON rehearsal_attendees FOR SELECT
  TO authenticated
  USING (is_rehearsal_band_member(rehearsal_id, auth.uid()));

-- Taguer un membre du groupe, sans jamais confirmer a sa place.
DROP POLICY IF EXISTS "Band members tag attendees" ON rehearsal_attendees;
CREATE POLICY "Band members tag attendees"
  ON rehearsal_attendees FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND tagged_by = auth.uid()
    AND is_rehearsal_band_member(rehearsal_id, auth.uid())
    AND is_rehearsal_band_member(rehearsal_id, user_id)
    AND rehearsal_band_is_active(rehearsal_id)
  );

-- Sa presence n'appartient qu'a soi, meme dans un groupe en lecture seule :
-- son carnet ne depend pas du plan du titulaire.
DROP POLICY IF EXISTS "Attendees answer for themselves" ON rehearsal_attendees;
CREATE POLICY "Attendees answer for themselves"
  ON rehearsal_attendees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Retirer un tag tant qu'il n'est pas confirme ; un musicien qui a confirme
-- garde sa presence jusqu'a ce qu'il efface sa session.
DROP POLICY IF EXISTS "Band members remove unconfirmed attendees" ON rehearsal_attendees;
CREATE POLICY "Band members remove unconfirmed attendees"
  ON rehearsal_attendees FOR DELETE
  TO authenticated
  USING (
    status <> 'confirmed'
    AND is_rehearsal_band_member(rehearsal_id, auth.uid())
    AND rehearsal_band_is_active(rehearsal_id)
  );

DROP POLICY IF EXISTS "Band members read rehearsal songs" ON rehearsal_songs;
CREATE POLICY "Band members read rehearsal songs"
  ON rehearsal_songs FOR SELECT
  TO authenticated
  USING (is_rehearsal_band_member(rehearsal_id, auth.uid()));

DROP POLICY IF EXISTS "Band members write rehearsal songs" ON rehearsal_songs;
CREATE POLICY "Band members write rehearsal songs"
  ON rehearsal_songs FOR ALL
  TO authenticated
  USING (is_rehearsal_band_member(rehearsal_id, auth.uid()) AND rehearsal_band_is_active(rehearsal_id))
  WITH CHECK (is_rehearsal_band_member(rehearsal_id, auth.uid()) AND rehearsal_band_is_active(rehearsal_id));

DROP POLICY IF EXISTS "Band members read rehearsal tasks" ON rehearsal_tasks;
CREATE POLICY "Band members read rehearsal tasks"
  ON rehearsal_tasks FOR SELECT
  TO authenticated
  USING (is_band_member(band_id, auth.uid()));

DROP POLICY IF EXISTS "Band members write rehearsal tasks" ON rehearsal_tasks;
CREATE POLICY "Band members write rehearsal tasks"
  ON rehearsal_tasks FOR ALL
  TO authenticated
  USING (is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
  WITH CHECK (
    is_band_member(band_id, auth.uid())
    AND band_is_active(band_id)
    AND (assignee_id IS NULL OR is_band_member(band_id, assignee_id))
    AND EXISTS (SELECT 1 FROM rehearsals r WHERE r.id = rehearsal_id AND r.band_id = rehearsal_tasks.band_id)
  );

-- === Enregistrer un compte rendu, d'un bloc ===
-- Sans SECURITY DEFINER : chaque ecriture repasse par les policies ci-dessus.
-- Renvoie qui prevenir : les nouveaux tagues et les nouveaux points a bosser.
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
  p_tasks JSONB
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

REVOKE ALL ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB) TO authenticated;

-- === Effacer sa session : la presence et l'activite suivent ===
-- SECURITY DEFINER : ca doit marcher aussi quand le groupe est en lecture seule,
-- ou chacun garde la main sur son propre carnet.
CREATE OR REPLACE FUNCTION release_rehearsal_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM practice_sessions
     WHERE rehearsal_id = OLD.rehearsal_id AND user_id = OLD.user_id
  ) THEN
    UPDATE rehearsal_attendees
       SET status = 'pending', responded_at = NULL
     WHERE rehearsal_id = OLD.rehearsal_id
       AND user_id = OLD.user_id
       AND status = 'confirmed';

    DELETE FROM activities
     WHERE user_id = OLD.user_id
       AND type = 'rehearsal_logged'
       AND reference_id = OLD.rehearsal_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS release_rehearsal_attendance ON practice_sessions;
CREATE TRIGGER release_rehearsal_attendance
  AFTER DELETE ON practice_sessions
  FOR EACH ROW
  WHEN (OLD.rehearsal_id IS NOT NULL)
  EXECUTE FUNCTION release_rehearsal_attendance();

-- === Effacer la repete : elle quitte le feed de tout le monde ===
CREATE OR REPLACE FUNCTION remove_rehearsal_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM activities
   WHERE type = 'rehearsal_logged'
     AND reference_id = OLD.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS remove_rehearsal_activities ON rehearsals;
CREATE TRIGGER remove_rehearsal_activities
  AFTER DELETE ON rehearsals
  FOR EACH ROW
  WHEN (OLD.logged_at IS NOT NULL)
  EXECUTE FUNCTION remove_rehearsal_activities();
