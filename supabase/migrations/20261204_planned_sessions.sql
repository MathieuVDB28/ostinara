-- Migration: sessions planifiees et notifications a l'heure
--
--   1. `planned_sessions` + `planned_session_people` : un rendez-vous avec soi,
--      ou avec un ami (un seul, invite par un Pro ou un Band). L'organisateur
--      modifie ; chacun a sa reponse, son rappel et son etat. Aucune ecriture
--      directe : tout passe par les RPC, sauf supprimer la sienne.
--   2. Une session enregistree coche le creneau du moment (trigger).
--   3. Reglages : rappels de ses sessions, relance du soir, repetes, et les
--      repetes d'un groupe donne.
--   4. Les rappels se reservent en base (claim_*, service role) : une route
--      appelee toutes les 5 minutes par Supabase Cron les envoie une fois.
--
-- A FAIRE UNE FOIS dans le SQL editor, avec les vraies valeurs (elles ne
-- doivent pas entrer dans le depot) :
--   SELECT vault.create_secret('https://MON-DOMAINE', 'app_url');
--   SELECT vault.create_secret('VALEUR DE CRON_SECRET', 'cron_secret');

-- === 1. Tables ===
CREATE TABLE IF NOT EXISTS planned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Les seances d'une meme recurrence.
  series_id UUID,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
  time_zone TEXT NOT NULL DEFAULT 'Europe/Paris',
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  note TEXT CHECK (char_length(note) <= 500),
  location TEXT CHECK (char_length(location) <= 200),
  instrument instrument,
  -- La source, relue au lancement ; `items` en garde une copie, celle de l'invite.
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  setlist_id UUID REFERENCES setlists(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS planned_sessions_user_idx ON planned_sessions (user_id, starts_at);
CREATE INDEX IF NOT EXISTS planned_sessions_starts_idx ON planned_sessions (starts_at);
CREATE INDEX IF NOT EXISTS planned_sessions_series_idx ON planned_sessions (series_id) WHERE series_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS planned_session_people (
  session_id UUID NOT NULL REFERENCES planned_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'guest')),
  rsvp TEXT NOT NULL DEFAULT 'invited' CHECK (rsvp IN ('invited', 'accepted', 'declined')),
  state TEXT NOT NULL DEFAULT 'planned' CHECK (state IN ('planned', 'done', 'skipped')),
  -- Minutes avant ; NULL : pas de rappel.
  remind_minutes INTEGER DEFAULT 15 CHECK (remind_minutes IN (0, 15, 60, 1440)),
  time_zone TEXT NOT NULL DEFAULT 'Europe/Paris',
  reminded_at TIMESTAMPTZ,
  nudged_at TIMESTAMPTZ,
  -- La session enregistree qui l'a coche (groupe, ou ligne seule).
  session_key UUID,
  PRIMARY KEY (session_id, user_id)
);
-- Un organisateur, un seul invite.
CREATE UNIQUE INDEX IF NOT EXISTS planned_session_people_role_idx ON planned_session_people (session_id, role);
CREATE INDEX IF NOT EXISTS planned_session_people_user_idx ON planned_session_people (user_id, state);

ALTER TABLE planned_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_session_people ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER : les deux tables se lisent l'une par l'autre.
CREATE OR REPLACE FUNCTION in_planned_session(p_session_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM planned_session_people WHERE session_id = p_session_id AND user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION in_planned_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION in_planned_session(UUID) TO authenticated;

DROP POLICY IF EXISTS "Planned sessions readable by their people" ON planned_sessions;
CREATE POLICY "Planned sessions readable by their people"
  ON planned_sessions FOR SELECT TO authenticated USING (in_planned_session(id));
DROP POLICY IF EXISTS "Owners delete their planned sessions" ON planned_sessions;
CREATE POLICY "Owners delete their planned sessions"
  ON planned_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Planned people readable by their people" ON planned_session_people;
CREATE POLICY "Planned people readable by their people"
  ON planned_session_people FOR SELECT TO authenticated USING (in_planned_session(session_id));

-- === RPC ===
CREATE OR REPLACE FUNCTION planned_free_limit_ok(p_user UUID, p_except UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_paid_plan(p_user) OR (
    SELECT count(*) FROM planned_sessions s
      JOIN planned_session_people p ON p.session_id = s.id AND p.user_id = s.user_id
     WHERE s.user_id = p_user AND s.starts_at > now() AND p.state = 'planned'
       AND s.id IS DISTINCT FROM p_except
  ) < 3;
$$;
REVOKE ALL ON FUNCTION planned_free_limit_ok(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION check_planned_guest(p_owner UUID, p_guest UUID)
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_paid_plan(p_owner) THEN
    RAISE EXCEPTION 'planned_guest_paid';
  END IF;
  IF p_guest = p_owner OR NOT EXISTS (
    SELECT 1 FROM friendships f
     WHERE f.status = 'accepted'
       AND ((f.requester_id = p_owner AND f.addressee_id = p_guest)
         OR (f.addressee_id = p_owner AND f.requester_id = p_guest))
  ) THEN
    RAISE EXCEPTION 'planned_guest_friend';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION check_planned_guest(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- La source doit etre lisible par l'organisateur : sinon on ne la relie pas.
CREATE OR REPLACE FUNCTION planned_routine(p_user UUID, p_data JSONB)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM routines WHERE id = NULLIF(p_data->>'routine_id', '')::uuid AND user_id = p_user;
$$;
CREATE OR REPLACE FUNCTION planned_setlist(p_user UUID, p_data JSONB)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM setlists WHERE id = NULLIF(p_data->>'setlist_id', '')::uuid
     AND (user_id = p_user OR (band_id IS NOT NULL AND is_band_member(band_id, p_user)));
$$;
REVOKE ALL ON FUNCTION planned_routine(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION planned_setlist(UUID, JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION create_planned_sessions(
  p_data JSONB, p_starts TIMESTAMPTZ[], p_guest UUID DEFAULT NULL, p_remind INTEGER DEFAULT 15
) RETURNS UUID[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_series UUID;
  v_start TIMESTAMPTZ;
  v_id UUID;
  v_ids UUID[] := '{}';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;
  IF COALESCE(cardinality(p_starts), 0) NOT BETWEEN 1 AND 104 THEN RAISE EXCEPTION 'planned_invalid'; END IF;

  -- Deux creations simultanees ne passent pas ensemble sous la limite.
  PERFORM pg_advisory_xact_lock(hashtextextended('planned:' || v_uid::text, 0));
  IF cardinality(p_starts) > 1 THEN
    IF NOT has_paid_plan(v_uid) THEN RAISE EXCEPTION 'planned_series_paid'; END IF;
    v_series := gen_random_uuid();
  END IF;
  IF NOT planned_free_limit_ok(v_uid) THEN RAISE EXCEPTION 'planned_limit'; END IF;
  IF p_guest IS NOT NULL THEN PERFORM check_planned_guest(v_uid, p_guest); END IF;

  FOREACH v_start IN ARRAY p_starts LOOP
    IF v_start <= now() THEN RAISE EXCEPTION 'planned_past'; END IF;
    INSERT INTO planned_sessions (user_id, series_id, starts_at, duration_minutes, time_zone, title, note,
                                  location, instrument, routine_id, setlist_id, items)
    VALUES (v_uid, v_series, v_start, (p_data->>'duration_minutes')::int, p_data->>'time_zone', p_data->>'title',
            p_data->>'note', p_data->>'location', (p_data->>'instrument')::instrument,
            planned_routine(v_uid, p_data), planned_setlist(v_uid, p_data), COALESCE(p_data->'items', '[]'::jsonb))
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;

    -- Un rappel dont l'heure est deja passee ne part pas a la creation.
    INSERT INTO planned_session_people (session_id, user_id, role, rsvp, remind_minutes, time_zone, reminded_at)
    VALUES (v_id, v_uid, 'owner', 'accepted', p_remind, p_data->>'time_zone',
            CASE WHEN v_start - make_interval(mins => p_remind) <= now() THEN now() END);
    IF p_guest IS NOT NULL THEN
      INSERT INTO planned_session_people (session_id, user_id, role, time_zone)
      VALUES (v_id, p_guest, 'guest', p_data->>'time_zone');
    END IF;
  END LOOP;
  RETURN v_ids;
END;
$$;

-- p_starts : [{ "id": …, "starts_at": … }], une ligne par seance touchee.
-- Deplacee, une seance redemande sa reponse a l'invite.
CREATE OR REPLACE FUNCTION update_planned_sessions(
  p_data JSONB, p_starts JSONB, p_guest UUID DEFAULT NULL, p_remind INTEGER DEFAULT 15
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row JSONB;
  v_old planned_sessions%ROWTYPE;
  v_start TIMESTAMPTZ;
  v_guest UUID;
  v_moved BOOLEAN;
BEGIN
  IF v_uid IS NULL OR jsonb_array_length(p_starts) NOT BETWEEN 1 AND 104 THEN
    RAISE EXCEPTION 'planned_not_allowed';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('planned:' || v_uid::text, 0));

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_starts) LOOP
    SELECT * INTO v_old FROM planned_sessions
     WHERE id = (v_row->>'id')::uuid AND user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;
    IF EXISTS (SELECT 1 FROM planned_session_people
                WHERE session_id = v_old.id AND user_id = v_uid AND state = 'done') THEN
      RAISE EXCEPTION 'planned_invalid';
    END IF;

    v_start := (v_row->>'starts_at')::timestamptz;
    v_moved := v_start IS DISTINCT FROM v_old.starts_at;
    IF v_moved THEN
      IF v_start <= now() THEN RAISE EXCEPTION 'planned_past'; END IF;
      -- Reporter une seance ratee la remet dans les seances a venir.
      IF v_old.starts_at <= now() AND NOT planned_free_limit_ok(v_uid, v_old.id) THEN
        RAISE EXCEPTION 'planned_limit';
      END IF;
    END IF;

    SELECT user_id INTO v_guest FROM planned_session_people WHERE session_id = v_old.id AND role = 'guest';
    IF p_guest IS DISTINCT FROM v_guest THEN
      IF p_guest IS NOT NULL THEN PERFORM check_planned_guest(v_uid, p_guest); END IF;
      DELETE FROM planned_session_people WHERE session_id = v_old.id AND role = 'guest';
      IF p_guest IS NOT NULL THEN
        INSERT INTO planned_session_people (session_id, user_id, role, time_zone)
        VALUES (v_old.id, p_guest, 'guest', v_old.time_zone);
      END IF;
    END IF;

    UPDATE planned_sessions
       SET starts_at = v_start,
           duration_minutes = (p_data->>'duration_minutes')::int,
           title = p_data->>'title',
           note = p_data->>'note',
           location = p_data->>'location',
           instrument = (p_data->>'instrument')::instrument,
           routine_id = planned_routine(v_uid, p_data),
           setlist_id = planned_setlist(v_uid, p_data),
           items = COALESCE(p_data->'items', '[]'::jsonb),
           updated_at = now()
     WHERE id = v_old.id;

    UPDATE planned_session_people
       SET remind_minutes = p_remind,
           state = CASE WHEN v_moved THEN 'planned' ELSE state END,
           nudged_at = CASE WHEN v_moved THEN NULL ELSE nudged_at END,
           reminded_at = CASE
             WHEN NOT v_moved AND remind_minutes IS NOT DISTINCT FROM p_remind THEN reminded_at
             WHEN v_start - make_interval(mins => p_remind) <= now() THEN now() END
     WHERE session_id = v_old.id AND user_id = v_uid;

    IF v_moved THEN
      UPDATE planned_session_people
         SET rsvp = 'invited', state = 'planned', reminded_at = NULL, nudged_at = NULL
       WHERE session_id = v_old.id AND role = 'guest' AND state <> 'done';
    END IF;
  END LOOP;
END;
$$;

-- Repondre vaut pour toutes les seances a venir de la serie encore sans reponse.
CREATE OR REPLACE FUNCTION answer_planned_session(p_id UUID, p_accept BOOLEAN, p_time_zone TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_series UUID;
BEGIN
  SELECT s.series_id INTO v_series FROM planned_sessions s
    JOIN planned_session_people p ON p.session_id = s.id
   WHERE s.id = p_id AND p.user_id = auth.uid() AND p.role = 'guest' AND s.starts_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;

  UPDATE planned_session_people p
     SET rsvp = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         time_zone = p_time_zone,
         reminded_at = CASE WHEN s.starts_at - make_interval(mins => p.remind_minutes) <= now() THEN now() END
    FROM planned_sessions s
   WHERE s.id = p.session_id AND p.user_id = auth.uid() AND p.role = 'guest'
     AND (s.id = p_id OR (v_series IS NOT NULL AND s.series_id = v_series AND p.rsvp = 'invited' AND s.starts_at > now()));
END;
$$;

-- Passer (ou reprendre) sa propre seance.
CREATE OR REPLACE FUNCTION set_planned_session_state(p_id UUID, p_skipped BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('planned:' || auth.uid()::text, 0));
  IF NOT p_skipped AND EXISTS (
    SELECT 1 FROM planned_sessions WHERE id = p_id AND user_id = auth.uid() AND starts_at > now()
  ) AND NOT planned_free_limit_ok(auth.uid(), p_id) THEN
    RAISE EXCEPTION 'planned_limit';
  END IF;
  UPDATE planned_session_people
     SET state = CASE WHEN p_skipped THEN 'skipped' ELSE 'planned' END
   WHERE session_id = p_id AND user_id = auth.uid() AND state <> 'done' AND rsvp = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;
END;
$$;

-- Le rappel de l'invite, a lui.
CREATE OR REPLACE FUNCTION set_planned_session_reminder(p_id UUID, p_remind INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE planned_session_people p
     SET remind_minutes = p_remind,
         reminded_at = CASE WHEN s.starts_at - make_interval(mins => p_remind) <= now() THEN now() END
    FROM planned_sessions s
   WHERE s.id = p.session_id AND p.session_id = p_id AND p.user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'planned_not_allowed'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION create_planned_sessions(JSONB, TIMESTAMPTZ[], UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION update_planned_sessions(JSONB, JSONB, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION answer_planned_session(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_planned_session_state(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_planned_session_reminder(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_planned_sessions(JSONB, TIMESTAMPTZ[], UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_planned_sessions(JSONB, JSONB, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION answer_planned_session(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_planned_session_state(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION set_planned_session_reminder(UUID, INTEGER) TO authenticated;

-- Plus amis : l'invitation a venir tombe, dans les deux sens.
CREATE OR REPLACE FUNCTION drop_planned_guests()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' THEN RETURN NULL; END IF;
  DELETE FROM planned_session_people p
   USING planned_sessions s
   WHERE s.id = p.session_id AND p.role = 'guest' AND s.starts_at > now()
     AND ((s.user_id = OLD.requester_id AND p.user_id = OLD.addressee_id)
       OR (s.user_id = OLD.addressee_id AND p.user_id = OLD.requester_id));
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS drop_planned_guests ON friendships;
CREATE TRIGGER drop_planned_guests
  AFTER DELETE OR UPDATE OF status ON friendships
  FOR EACH ROW EXECUTE FUNCTION drop_planned_guests();

-- === 2. Cocher le creneau ===
-- De 2 h avant a 6 h apres l'heure prevue, le plus proche. Les lignes d'une
-- meme session (un morceau chacune) ne cochent qu'un creneau. Une repete
-- confirmee n'en coche aucun.
CREATE OR REPLACE FUNCTION complete_planned_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key UUID := COALESCE(NEW.session_group_id, NEW.id);
  v_slot UUID;
BEGIN
  IF NEW.rehearsal_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM planned_session_people WHERE user_id = NEW.user_id AND session_key = v_key) THEN
    RETURN NULL;
  END IF;
  SELECT s.id INTO v_slot
    FROM planned_sessions s
    JOIN planned_session_people p ON p.session_id = s.id
   WHERE p.user_id = NEW.user_id AND p.rsvp = 'accepted' AND p.state = 'planned'
     AND NEW.practiced_at BETWEEN s.starts_at - INTERVAL '2 hours' AND s.starts_at + INTERVAL '6 hours'
     AND (s.instrument IS NULL OR p.role = 'guest' OR s.instrument = NEW.instrument)
   ORDER BY abs(extract(epoch FROM NEW.practiced_at - s.starts_at))
   LIMIT 1;
  IF v_slot IS NOT NULL THEN
    UPDATE planned_session_people SET state = 'done', session_key = v_key
     WHERE session_id = v_slot AND user_id = NEW.user_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS complete_planned_session ON practice_sessions;
CREATE TRIGGER complete_planned_session
  AFTER INSERT ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION complete_planned_session();

-- La session effacee, le creneau se decoche.
CREATE OR REPLACE FUNCTION uncomplete_planned_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key UUID := COALESCE(OLD.session_group_id, OLD.id);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM practice_sessions WHERE COALESCE(session_group_id, id) = v_key) THEN
    UPDATE planned_session_people SET state = 'planned', session_key = NULL
     WHERE user_id = OLD.user_id AND session_key = v_key;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS uncomplete_planned_session ON practice_sessions;
CREATE TRIGGER uncomplete_planned_session
  AFTER DELETE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION uncomplete_planned_session();

-- Un fuseau inconnu ferait echouer les rappels de tout le monde.
CREATE OR REPLACE FUNCTION check_time_zone()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.time_zone IS NULL THEN RAISE EXCEPTION 'time_zone_invalid'; END IF;
  PERFORM now() AT TIME ZONE NEW.time_zone;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS check_time_zone ON planned_sessions;
CREATE TRIGGER check_time_zone BEFORE INSERT OR UPDATE OF time_zone ON planned_sessions
  FOR EACH ROW EXECUTE FUNCTION check_time_zone();
DROP TRIGGER IF EXISTS check_time_zone ON planned_session_people;
CREATE TRIGGER check_time_zone BEFORE INSERT OR UPDATE OF time_zone ON planned_session_people
  FOR EACH ROW EXECUTE FUNCTION check_time_zone();
DROP TRIGGER IF EXISTS check_time_zone ON rehearsals;
CREATE TRIGGER check_time_zone BEFORE INSERT OR UPDATE OF time_zone ON rehearsals
  FOR EACH ROW EXECUTE FUNCTION check_time_zone();

-- === 3. Reglages ===
ALTER TABLE profile_private
  ADD COLUMN IF NOT EXISTS notify_planned BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_planned_missed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rehearsals BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE band_members
  ADD COLUMN IF NOT EXISTS rehearsal_notifications BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION set_band_rehearsal_notifications(p_band_id UUID, p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifie'; END IF;
  UPDATE band_members SET rehearsal_notifications = p_enabled
   WHERE band_id = p_band_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION set_band_rehearsal_notifications(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_band_rehearsal_notifications(UUID, BOOLEAN) TO authenticated;

-- === 4. Rappels ===
ALTER TABLE rehearsals
  ADD COLUMN IF NOT EXISTS soon_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unanswered_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS log_reminded_at TIMESTAMPTZ,
  -- Creee ou deplacee : la relance des sans-reponse laisse 24 h.
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Les repetes deja passees ne reclament pas leur compte rendu.
UPDATE rehearsals SET log_reminded_at = now() WHERE date < now() AND log_reminded_at IS NULL;

CREATE OR REPLACE FUNCTION reset_rehearsal_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.soon_reminded_at := NULL;
  NEW.unanswered_reminded_at := NULL;
  NEW.log_reminded_at := NULL;
  NEW.scheduled_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reset_rehearsal_reminders ON rehearsals;
CREATE TRIGGER reset_rehearsal_reminders
  BEFORE UPDATE OF date ON rehearsals
  FOR EACH ROW WHEN (OLD.date IS DISTINCT FROM NEW.date AND NEW.logged_at IS NULL)
  EXECUTE FUNCTION reset_rehearsal_reminders();

-- Chaque claim reserve ce qu'il rend : deux appels simultanes ne doublent rien.
-- Un retard de plus de 15 minutes sur l'heure prevue ne rappelle plus.
CREATE OR REPLACE FUNCTION claim_planned_reminders()
RETURNS TABLE (session_id UUID, user_id UUID, title TEXT, starts_at TIMESTAMPTZ, time_zone TEXT, remind_minutes INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE planned_session_people p SET reminded_at = now()
    FROM planned_sessions s
   WHERE s.id = p.session_id AND p.reminded_at IS NULL AND p.remind_minutes IS NOT NULL
     AND p.rsvp = 'accepted' AND p.state = 'planned'
     AND s.starts_at - make_interval(mins => p.remind_minutes) <= now()
     AND s.starts_at > now() - INTERVAL '15 minutes'
     AND NOT EXISTS (SELECT 1 FROM profile_private pp WHERE pp.user_id = p.user_id AND NOT pp.notify_planned)
  RETURNING p.session_id, p.user_id, s.title, s.starts_at, p.time_zone, p.remind_minutes;
$$;

-- Le soir (20 h a 22 h chez soi) : la seance du jour est passee, rien n'a ete joue.
CREATE OR REPLACE FUNCTION claim_planned_nudges()
RETURNS TABLE (session_id UUID, user_id UUID, title TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH due AS (
    -- Une relance par personne et par soir, meme avec deux seances ratees.
    SELECT DISTINCT ON (p.user_id) p.session_id, p.user_id
      FROM planned_session_people p
      JOIN planned_sessions s ON s.id = p.session_id
     WHERE p.rsvp = 'accepted' AND p.state = 'planned' AND p.nudged_at IS NULL
       AND s.starts_at + make_interval(mins => s.duration_minutes) < now() - INTERVAL '30 minutes'
       AND s.starts_at > now() - INTERVAL '24 hours'
       AND (s.starts_at AT TIME ZONE p.time_zone)::date = (now() AT TIME ZONE p.time_zone)::date
       AND extract(hour FROM now() AT TIME ZONE p.time_zone) BETWEEN 20 AND 21
       AND NOT EXISTS (
         SELECT 1 FROM practice_sessions ps
          WHERE ps.user_id = p.user_id AND ps.practiced_at > now() - INTERVAL '24 hours'
            AND (ps.practiced_at AT TIME ZONE p.time_zone)::date = (now() AT TIME ZONE p.time_zone)::date)
       AND NOT EXISTS (
         SELECT 1 FROM planned_session_people q
          WHERE q.user_id = p.user_id AND q.nudged_at > now() - INTERVAL '6 hours')
       AND NOT EXISTS (
         SELECT 1 FROM profile_private pp
          WHERE pp.user_id = p.user_id AND NOT (pp.notify_planned AND pp.notify_planned_missed))
     ORDER BY p.user_id, s.starts_at DESC
  )
  UPDATE planned_session_people p SET nudged_at = now()
    FROM due, planned_sessions s
   WHERE p.session_id = due.session_id AND p.user_id = due.user_id AND s.id = p.session_id AND p.nudged_at IS NULL
  RETURNING p.session_id, p.user_id, s.title;
$$;

-- p_kind : 'soon' (dans l'heure), 'unanswered' (J-2), 'log' (apres la repete,
-- entre 9 h et 22 h chez le groupe).
CREATE OR REPLACE FUNCTION claim_rehearsal_reminders(p_kind TEXT)
RETURNS SETOF rehearsals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_kind = 'soon' THEN
    RETURN QUERY UPDATE rehearsals r SET soon_reminded_at = now()
     WHERE r.status = 'scheduled' AND r.soon_reminded_at IS NULL
       AND r.date > now() AND r.date <= now() + INTERVAL '1 hour'
    RETURNING r.*;
  ELSIF p_kind = 'unanswered' THEN
    RETURN QUERY UPDATE rehearsals r SET unanswered_reminded_at = now()
     WHERE r.status = 'scheduled' AND r.unanswered_reminded_at IS NULL
       AND r.date > now() + INTERVAL '24 hours' AND r.date <= now() + INTERVAL '48 hours'
       AND r.scheduled_at < now() - INTERVAL '24 hours'
       AND extract(hour FROM now() AT TIME ZONE r.time_zone) BETWEEN 9 AND 21
    RETURNING r.*;
  ELSIF p_kind = 'log' THEN
    RETURN QUERY UPDATE rehearsals r SET log_reminded_at = now()
     WHERE r.status = 'scheduled' AND r.logged_at IS NULL AND r.log_reminded_at IS NULL
       AND COALESCE(r.end_date, r.date + INTERVAL '2 hours') < now() - INTERVAL '30 minutes'
       AND r.date > now() - INTERVAL '36 hours'
       AND extract(hour FROM now() AT TIME ZONE r.time_zone) BETWEEN 9 AND 21
       AND band_is_active(r.band_id)
    RETURNING r.*;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION claim_planned_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_planned_nudges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_rehearsal_reminders(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_planned_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION claim_planned_nudges() TO service_role;
GRANT EXECUTE ON FUNCTION claim_rehearsal_reminders(TEXT) TO service_role;

-- === Supabase Cron : toutes les 5 minutes ===
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'planning-reminders',
  '*/5 * * * *',
  $cron$
    SELECT net.http_get(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/planning',
      headers := jsonb_build_object('Authorization',
        'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
      timeout_milliseconds := 30000
    );
  $cron$
);
