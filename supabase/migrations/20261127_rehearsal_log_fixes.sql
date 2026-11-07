-- Migration: comptes rendus de repete, suite de l'audit (R3, R4, R6)
--
-- R3. Corriger la date d'une repete racontee deplace les sessions deja
--     confirmees et l'activite du feed. La duree reste celle que chacun a
--     choisie. Une repete racontee ne part pas dans le futur.
-- R4. Deux membres qui corrigent le meme compte rendu ne s'ecrasent plus :
--     save_rehearsal_log recoit le `updated_at` lu a l'ouverture du formulaire
--     et refuse si la repete a change depuis. `rehearsals.updated_by` dit qui.
-- R6. Une presence n'est confirmee que par une session : le musicien ne peut
--     plus ecrire « confirmed » lui-meme, c'est l'insertion de sa session qui
--     le fait. Une session ne se relie qu'a une repete ou l'on est tague, une
--     seule fois.

-- === R4 : qui a touche la repete en dernier ===
ALTER TABLE rehearsals
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION set_rehearsal_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Le cron et le service role n'ont pas d'auth.uid() : on garde le dernier auteur.
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_rehearsal_updated_by ON rehearsals;
CREATE TRIGGER set_rehearsal_updated_by
  BEFORE UPDATE ON rehearsals
  FOR EACH ROW EXECUTE FUNCTION set_rehearsal_updated_by();

-- === R3 : la date de la repete, partout ou elle est recopiee ===
CREATE OR REPLACE FUNCTION follow_rehearsal_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logged_at IS NOT NULL AND NEW.date > now() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Repete dans le futur';
  END IF;

  UPDATE practice_sessions
     SET practiced_at = NEW.date
   WHERE rehearsal_id = NEW.id
     AND practiced_at IS DISTINCT FROM NEW.date;

  UPDATE activities
     SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{practiced_at}', to_jsonb(NEW.date))
   WHERE type = 'rehearsal_logged'
     AND reference_id = NEW.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS follow_rehearsal_date ON rehearsals;
CREATE TRIGGER follow_rehearsal_date
  AFTER UPDATE OF date ON rehearsals
  FOR EACH ROW
  WHEN (OLD.date IS DISTINCT FROM NEW.date)
  EXECUTE FUNCTION follow_rehearsal_date();

-- === R6 : une presence confirmee vient d'une session ===

-- Repondre pour soi, sans jamais ecrire « confirmed » ; une presence confirmee
-- ne se retire qu'en effacant sa session.
DROP POLICY IF EXISTS "Attendees answer for themselves" ON rehearsal_attendees;
CREATE POLICY "Attendees answer for themselves"
  ON rehearsal_attendees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status <> 'confirmed')
  WITH CHECK (user_id = auth.uid() AND status <> 'confirmed');

-- Avant d'inserer : il faut etre tague a cette repete, et n'y avoir aucune autre
-- session. Le verrou sur la presence fait passer deux envois simultanes l'un
-- apres l'autre : le second voit la session du premier.
CREATE OR REPLACE FUNCTION check_rehearsal_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.rehearsal_id IS NOT DISTINCT FROM OLD.rehearsal_id OR NEW.rehearsal_id IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Session deja reliee';
  END IF;

  PERFORM 1
     FROM rehearsal_attendees
    WHERE rehearsal_id = NEW.rehearsal_id
      AND user_id = NEW.user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pas tague a cette repete';
  END IF;

  -- Les lignes d'une meme session (un morceau par ligne) partagent leur groupe.
  IF EXISTS (
    SELECT 1 FROM practice_sessions
     WHERE rehearsal_id = NEW.rehearsal_id
       AND user_id = NEW.user_id
       AND (NEW.session_group_id IS NULL OR session_group_id IS DISTINCT FROM NEW.session_group_id)
  ) THEN
    RAISE EXCEPTION 'Repete deja dans le carnet';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_rehearsal_session ON practice_sessions;
CREATE TRIGGER check_rehearsal_session
  BEFORE INSERT OR UPDATE OF rehearsal_id ON practice_sessions
  FOR EACH ROW
  WHEN (NEW.rehearsal_id IS NOT NULL)
  EXECUTE FUNCTION check_rehearsal_session();

-- Apres : la session confirme la presence.
CREATE OR REPLACE FUNCTION confirm_rehearsal_attendance_from_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rehearsal_attendees
     SET status = 'confirmed', responded_at = now()
   WHERE rehearsal_id = NEW.rehearsal_id
     AND user_id = NEW.user_id
     AND status <> 'confirmed';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS confirm_rehearsal_attendance_from_session ON practice_sessions;
CREATE TRIGGER confirm_rehearsal_attendance_from_session
  AFTER INSERT ON practice_sessions
  FOR EACH ROW
  WHEN (NEW.rehearsal_id IS NOT NULL)
  EXECUTE FUNCTION confirm_rehearsal_attendance_from_session();

-- Detacher sa session de la repete compte comme l'effacer.
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

DROP TRIGGER IF EXISTS release_rehearsal_attendance_on_unlink ON practice_sessions;
CREATE TRIGGER release_rehearsal_attendance_on_unlink
  AFTER UPDATE OF rehearsal_id ON practice_sessions
  FOR EACH ROW
  WHEN (OLD.rehearsal_id IS NOT NULL AND NEW.rehearsal_id IS NULL)
  EXECUTE FUNCTION release_rehearsal_attendance();

-- Les presences deja confirmees sans session redeviennent a confirmer.
UPDATE rehearsal_attendees a
   SET status = 'pending', responded_at = NULL
 WHERE a.status = 'confirmed'
   AND NOT EXISTS (
     SELECT 1 FROM practice_sessions s
      WHERE s.rehearsal_id = a.rehearsal_id AND s.user_id = a.user_id
   );

-- === R4 : enregistrer un compte rendu, sans ecraser celui d'un autre ===
DROP FUNCTION IF EXISTS save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB);

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

REVOKE ALL ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_rehearsal_log(UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, UUID, TEXT, UUID[], JSONB, JSONB, TIMESTAMPTZ) TO authenticated;
