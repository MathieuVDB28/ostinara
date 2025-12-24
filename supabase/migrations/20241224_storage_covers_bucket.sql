-- Créer le bucket pour les covers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  209715200,  -- 200 MB en bytes
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politique : les utilisateurs peuvent uploader dans leur dossier
CREATE POLICY "Users can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique : les utilisateurs peuvent voir leurs propres fichiers
CREATE POLICY "Users can view own cover files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique : tout le monde peut voir les fichiers publics (bucket public)
CREATE POLICY "Anyone can view public cover files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- Politique : les utilisateurs peuvent supprimer leurs propres fichiers
CREATE POLICY "Users can delete own cover files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
