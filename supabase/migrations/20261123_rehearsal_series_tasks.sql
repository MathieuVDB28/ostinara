-- Migration: une serie de repetes ne part plus d'un bloc, et une tache ne reste
-- pas attachee a un ancien membre
--
-- 1. Supprimer la premiere repete d'une serie supprimait toutes les autres en
--    cascade, comptes rendus compris. Les suivantes restent maintenant ;
--    l'action deleteRehearsal rattache la serie a la plus ancienne d'abord.
-- 2. Une tache assignee a quelqu'un qui a quitte le groupe ne passait plus la
--    policy : impossible de la cocher ou de modifier son compte rendu. Elle
--    revient au groupe entier.

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
    FROM pg_constraint
   WHERE conrelid = 'rehearsals'::regclass
     AND contype = 'f'
     AND confrelid = 'rehearsals'::regclass;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE rehearsals DROP CONSTRAINT %I', v_constraint);
  END IF;
END;
$$;

ALTER TABLE rehearsals
  ADD CONSTRAINT rehearsals_parent_rehearsal_id_fkey
  FOREIGN KEY (parent_rehearsal_id) REFERENCES rehearsals(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION release_member_rehearsal_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rehearsal_tasks
     SET assignee_id = NULL
   WHERE band_id = OLD.band_id
     AND assignee_id = OLD.user_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS release_member_rehearsal_tasks ON band_members;
CREATE TRIGGER release_member_rehearsal_tasks
  AFTER DELETE ON band_members
  FOR EACH ROW EXECUTE FUNCTION release_member_rehearsal_tasks();

-- Celles qui sont deja bloquees.
UPDATE rehearsal_tasks t
   SET assignee_id = NULL
 WHERE t.assignee_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM band_members m
      WHERE m.band_id = t.band_id AND m.user_id = t.assignee_id
   );
