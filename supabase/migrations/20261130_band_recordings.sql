-- Migration: demos et enregistrements du groupe (F6)
--
-- Un enregistrement (audio ou video) appartient a un groupe. On peut le
-- relier a une fiche du repertoire (demo, prise d'un morceau) et/ou a une
-- repete. Il se commente a un moment precis, ou sur un passage (debut et
-- fin), et chaque commentaire recoit des reponses sur un seul niveau.
--
-- Les fichiers vont dans le bucket prive `band-recordings`, au chemin
-- <groupe>/<auteur>/<fichier>. Ils se lisent par des liens signes, emis par
-- le serveur pour les lignes que la RLS laisse lire
-- (src/lib/storage/band-recording-media.ts).
--
-- 20 Go par groupe, quel que soit le plan de qui envoie : la taille est lue
-- dans storage.objects. Comme pour les covers, un dernier fichier peut
-- depasser d'au plus sa propre taille (500 Mo par fichier).
--
-- Tout membre ecoute, meme en lecture seule ; tout membre d'un groupe actif
-- ajoute et commente. L'auteur supprime le sien, meme en lecture seule ; le
-- titulaire et les admins suppriment tout dans un groupe actif.

-- === Le bucket ===
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'band-recordings',
  'band-recordings',
  false,
  524288000,
  ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ce qu'occupent les fichiers d'un groupe.
CREATE OR REPLACE FUNCTION band_recording_storage_used(p_band_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0)::BIGINT
    FROM storage.objects
   WHERE bucket_id = 'band-recordings'
     AND (storage.foldername(name))[1] = p_band_id::TEXT;
$$;

REVOKE ALL ON FUNCTION band_recording_storage_used(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION band_recording_storage_used(UUID) TO authenticated;

-- Pour la jauge et l'avertissement avant envoi : reserve aux membres.
CREATE OR REPLACE FUNCTION my_band_recording_storage(p_band_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_band_member(p_band_id, auth.uid()) THEN band_recording_storage_used(p_band_id)
  END;
$$;

REVOKE ALL ON FUNCTION my_band_recording_storage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_band_recording_storage(UUID) TO authenticated;

-- Le premier dossier doit etre un UUID : un nom libre ferait echouer le cast.
CREATE OR REPLACE FUNCTION band_recording_folder_band(p_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
SET search_path = public, storage
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] ~ '^[0-9a-fA-F-]{36}$' THEN (storage.foldername(p_name))[1]::UUID
  END;
$$;

-- Envoyer : dans le dossier d'un groupe actif dont on est membre, dans son
-- propre sous-dossier, tant que le groupe n'a pas atteint ses 20 Go.
DROP POLICY IF EXISTS "Band members upload recordings" ON storage.objects;
CREATE POLICY "Band members upload recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'band-recordings'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND is_band_member(band_recording_folder_band(name), auth.uid())
    AND band_is_active(band_recording_folder_band(name))
    AND band_recording_storage_used(band_recording_folder_band(name)) < 21474836480
  );

-- Pas de lecture ni de suppression directes : le serveur signe les liens
-- et efface les fichiers (service role) apres avoir lu ou supprime la ligne
-- sous RLS.

-- === Les enregistrements ===
CREATE TABLE IF NOT EXISTS band_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  kind TEXT NOT NULL DEFAULT 'demo' CHECK (kind IN ('demo', 'rehearsal', 'concert', 'other')),
  note TEXT CHECK (char_length(note) <= 2000),
  band_song_id UUID REFERENCES band_songs(id) ON DELETE SET NULL,
  rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE SET NULL,
  -- Chemin dans le bucket : <groupe>/<auteur>/<fichier>.
  media_path TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  mime_type TEXT CHECK (char_length(mime_type) <= 100),
  duration_seconds NUMERIC(9, 2) CHECK (duration_seconds >= 0),
  file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS band_recordings_band_idx ON band_recordings (band_id, created_at DESC);
CREATE INDEX IF NOT EXISTS band_recordings_song_idx ON band_recordings (band_song_id) WHERE band_song_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS band_recordings_rehearsal_idx ON band_recordings (rehearsal_id) WHERE rehearsal_id IS NOT NULL;

-- Le fichier est celui de l'auteur dans ce groupe ; morceau et repete sont
-- ceux du groupe ; ni le groupe, ni l'auteur, ni le fichier ne changent.
CREATE OR REPLACE FUNCTION check_band_recording()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.band_id := OLD.band_id;
    NEW.user_id := OLD.user_id;
    NEW.media_path := OLD.media_path;
    NEW.media_type := OLD.media_type;
    NEW.mime_type := OLD.mime_type;
    NEW.file_size_bytes := OLD.file_size_bytes;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
    IF split_part(NEW.media_path, '/', 1) <> NEW.band_id::TEXT
      OR split_part(NEW.media_path, '/', 2) <> COALESCE(NEW.user_id::TEXT, '')
    THEN
      RAISE EXCEPTION 'Le fichier doit etre dans le dossier de son auteur, pour ce groupe'
        USING ERRCODE = '42501';
    END IF;
    -- Le fichier est deja envoye : on tolere ce seul depassement.
    IF band_recording_storage_used(NEW.band_id) - COALESCE(NEW.file_size_bytes, 0) >= 21474836480 THEN
      RAISE EXCEPTION 'Stockage du groupe plein' USING ERRCODE = '53100';
    END IF;
  END IF;

  IF NEW.band_song_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM band_songs WHERE id = NEW.band_song_id AND band_id = NEW.band_id)
  THEN
    RAISE EXCEPTION 'Morceau hors du groupe' USING ERRCODE = '42501';
  END IF;

  IF NEW.rehearsal_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM rehearsals WHERE id = NEW.rehearsal_id AND band_id = NEW.band_id)
  THEN
    RAISE EXCEPTION 'Repete hors du groupe' USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_recording ON band_recordings;
CREATE TRIGGER check_band_recording
  BEFORE INSERT OR UPDATE ON band_recordings
  FOR EACH ROW EXECUTE FUNCTION check_band_recording();

ALTER TABLE band_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members read recordings" ON band_recordings;
CREATE POLICY "Band members read recordings"
  ON band_recordings FOR SELECT
  TO authenticated
  USING (is_band_member(band_id, auth.uid()));

DROP POLICY IF EXISTS "Band members add recordings" ON band_recordings;
CREATE POLICY "Band members add recordings"
  ON band_recordings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(band_id, auth.uid())
    AND band_is_active(band_id)
  );

DROP POLICY IF EXISTS "Authors edit their recordings" ON band_recordings;
CREATE POLICY "Authors edit their recordings"
  ON band_recordings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_band_member(band_id, auth.uid()) AND band_is_active(band_id))
  WITH CHECK (user_id = auth.uid() AND is_band_member(band_id, auth.uid()) AND band_is_active(band_id));

DROP POLICY IF EXISTS "Authors and admins delete recordings" ON band_recordings;
CREATE POLICY "Authors and admins delete recordings"
  ON band_recordings FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND is_band_member(band_id, auth.uid()))
    OR (is_band_admin_or_owner(band_id, auth.uid()) AND band_is_active(band_id))
  );

-- === Les commentaires ===
CREATE TABLE IF NOT EXISTS band_recording_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES band_recordings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Une reponse : pas de moment a elle, elle suit celui de son commentaire.
  parent_id UUID REFERENCES band_recording_comments(id) ON DELETE CASCADE,
  start_seconds NUMERIC(9, 2) CHECK (start_seconds >= 0),
  end_seconds NUMERIC(9, 2),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_seconds IS NULL OR (start_seconds IS NOT NULL AND end_seconds > start_seconds)),
  CHECK ((parent_id IS NULL) = (start_seconds IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS band_recording_comments_recording_idx
  ON band_recording_comments (recording_id, start_seconds);
CREATE INDEX IF NOT EXISTS band_recording_comments_parent_idx
  ON band_recording_comments (parent_id) WHERE parent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION band_recording_band(p_recording_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT band_id FROM band_recordings WHERE id = p_recording_id;
$$;

-- Une reponse vise un commentaire du meme enregistrement, jamais une reponse ;
-- un moment ne depasse pas la duree connue (une seconde de marge).
CREATE OR REPLACE FUNCTION check_band_recording_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_duration NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.recording_id := OLD.recording_id;
    NEW.user_id := OLD.user_id;
    NEW.parent_id := OLD.parent_id;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
  END IF;

  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM band_recording_comments
     WHERE id = NEW.parent_id AND recording_id = NEW.recording_id AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Reponse a un commentaire introuvable' USING ERRCODE = '23503';
  END IF;

  SELECT duration_seconds INTO v_duration FROM band_recordings WHERE id = NEW.recording_id;
  IF v_duration IS NOT NULL AND (NEW.start_seconds > v_duration + 1 OR NEW.end_seconds > v_duration + 1) THEN
    RAISE EXCEPTION 'Moment au-dela de la fin' USING ERRCODE = '22003';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_band_recording_comment ON band_recording_comments;
CREATE TRIGGER check_band_recording_comment
  BEFORE INSERT OR UPDATE ON band_recording_comments
  FOR EACH ROW EXECUTE FUNCTION check_band_recording_comment();

ALTER TABLE band_recording_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members read recording comments" ON band_recording_comments;
CREATE POLICY "Band members read recording comments"
  ON band_recording_comments FOR SELECT
  TO authenticated
  USING (is_band_member(band_recording_band(recording_id), auth.uid()));

DROP POLICY IF EXISTS "Band members comment recordings" ON band_recording_comments;
CREATE POLICY "Band members comment recordings"
  ON band_recording_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(band_recording_band(recording_id), auth.uid())
    AND band_is_active(band_recording_band(recording_id))
  );

DROP POLICY IF EXISTS "Authors edit their recording comments" ON band_recording_comments;
CREATE POLICY "Authors edit their recording comments"
  ON band_recording_comments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_band_member(band_recording_band(recording_id), auth.uid())
    AND band_is_active(band_recording_band(recording_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_band_member(band_recording_band(recording_id), auth.uid())
    AND band_is_active(band_recording_band(recording_id))
  );

DROP POLICY IF EXISTS "Authors and admins delete recording comments" ON band_recording_comments;
CREATE POLICY "Authors and admins delete recording comments"
  ON band_recording_comments FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND is_band_member(band_recording_band(recording_id), auth.uid()))
    OR (
      is_band_admin_or_owner(band_recording_band(recording_id), auth.uid())
      AND band_is_active(band_recording_band(recording_id))
    )
  );
