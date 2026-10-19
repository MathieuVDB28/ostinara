-- Migration: modifier ses commentaires du feed
--
-- L'auteur d'un commentaire peut en changer le texte. edited_at garde la
-- date de la derniere modification (NULL = jamais modifie) pour afficher
-- « modifie » sous le commentaire.
--
-- Seul le texte peut changer : le trigger remet l'activite, l'auteur et la
-- date de creation tels qu'ils etaient, et date la modification lui-meme.

ALTER TABLE activity_comments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION activity_comments_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.activity_id := OLD.activity_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := NOW();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_comments_before_update ON activity_comments;
CREATE TRIGGER activity_comments_before_update
  BEFORE UPDATE ON activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION activity_comments_before_update();

-- Les utilisateurs peuvent modifier leurs propres commentaires
DROP POLICY IF EXISTS "Users can update own comments" ON activity_comments;
CREATE POLICY "Users can update own comments"
  ON activity_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
