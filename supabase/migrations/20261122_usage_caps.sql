-- Migration: plafonds de stockage et de reconnaissance audio
--
-- 20 Go de covers par personne : les fichiers du dossier de chacun dans le
-- bucket, lus dans storage.objects (la taille envoyee par le navigateur ne fait
-- pas foi). Un dernier fichier peut depasser d'au plus 200 Mo : a l'envoi, sa
-- taille n'est pas encore connue de la base.
--
-- 30 essais de reconnaissance audio par jour et par personne (jour de Paris) :
-- AudD facture chaque essai, qu'il trouve le morceau ou non.

CREATE OR REPLACE FUNCTION cover_storage_used(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0)::BIGINT
    FROM storage.objects
   WHERE bucket_id = 'covers'
     AND (storage.foldername(name))[1] = p_user_id::TEXT;
$$;

REVOKE ALL ON FUNCTION cover_storage_used(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cover_storage_used(UUID) TO authenticated;

-- Son propre stockage, pour l'avertir avant un envoi.
CREATE OR REPLACE FUNCTION my_cover_storage_used()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cover_storage_used(auth.uid());
$$;

REVOKE ALL ON FUNCTION my_cover_storage_used() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_cover_storage_used() TO authenticated;

DROP POLICY IF EXISTS "Users can upload covers" ON storage.objects;
CREATE POLICY "Users can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND cover_storage_used(auth.uid()) < 21474836480
  );

CREATE OR REPLACE FUNCTION check_cover_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Le fichier de cette cover est deja envoye : on tolere ce seul depassement.
  IF cover_storage_used(NEW.user_id) - COALESCE(NEW.file_size_bytes, 0) >= 21474836480 THEN
    RAISE EXCEPTION 'Stockage des covers plein' USING ERRCODE = '53100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_cover_storage_quota ON covers;
CREATE TRIGGER check_cover_storage_quota
  BEFORE INSERT ON covers
  FOR EACH ROW EXECUTE FUNCTION check_cover_storage_quota();

CREATE TABLE IF NOT EXISTS audio_identification_usage (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Aucune policy : ecrite par la fonction ci-dessous, purgee par le cron.
ALTER TABLE audio_identification_usage ENABLE ROW LEVEL SECURITY;

-- Prend un essai et dit s'il en restait un, sans course entre deux appels.
CREATE OR REPLACE FUNCTION consume_audio_identification()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO audio_identification_usage AS usage (user_id, day, attempts)
  VALUES (auth.uid(), (now() AT TIME ZONE 'Europe/Paris')::DATE, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET attempts = usage.attempts + 1
    WHERE usage.attempts < 30
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION consume_audio_identification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_audio_identification() TO authenticated;
