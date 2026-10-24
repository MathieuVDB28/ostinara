-- Migration: le bucket des covers devient prive
--
-- Les fichiers etaient servis par des URL publiques : quiconque avait le
-- lien d'une video la lisait, quel que soit le reglage de la cover. Ils se
-- lisent maintenant par des liens signes (6 h), emis par le serveur pour
-- les seules covers que la RLS de `covers` laisse voir
-- (src/lib/storage/cover-media.ts).
--
-- A appliquer APRES le deploiement du code qui signe les liens : l'ancien
-- code affiche les URL publiques, qui cessent de fonctionner ici.

UPDATE storage.buckets SET public = false WHERE id = 'covers';

-- Le proprietaire garde la lecture de ses fichiers ("Users can view own
-- cover files") ; plus personne d'autre ne les lit directement.
DROP POLICY IF EXISTS "Anyone can view public cover files" ON storage.objects;

-- === Une cover ne pointe que vers un fichier de son auteur ===
-- Le serveur signe le fichier d'une cover pour qui la voit : une cover qui
-- pointerait le fichier d'un autre le rendrait lisible. Les lignes gardent
-- l'URL publique d'origine ou, depuis ce changement, le chemin seul.
CREATE OR REPLACE FUNCTION cover_storage_path(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN NULL
    WHEN p_value ~ '^https?://' THEN substring(p_value FROM '/storage/v1/object/(?:public|sign)/covers/([^?]+)')
    ELSE p_value
  END;
$$;

CREATE OR REPLACE FUNCTION check_cover_media_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF split_part(coalesce(cover_storage_path(NEW.media_url), ''), '/', 1) <> NEW.user_id::text THEN
    RAISE EXCEPTION 'Le fichier d''une cover doit etre dans le dossier de son auteur'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.thumbnail_url IS NOT NULL
    AND cover_storage_path(NEW.thumbnail_url) IS NOT NULL
    AND split_part(cover_storage_path(NEW.thumbnail_url), '/', 1) <> NEW.user_id::text
  THEN
    RAISE EXCEPTION 'La miniature d''une cover doit etre dans le dossier de son auteur'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_cover_media_owner ON covers;
CREATE TRIGGER check_cover_media_owner
  BEFORE INSERT OR UPDATE OF media_url, thumbnail_url, user_id ON covers
  FOR EACH ROW EXECUTE FUNCTION check_cover_media_owner();
