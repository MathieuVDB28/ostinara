-- Migration: les exercices d'une session sont enregistres
--
-- Une session peut etre faite d'exercices, voire n'etre que ca. Leur temps
-- vit deja dans la ligne « hors morceau » de la session (practice_sessions,
-- song_id NULL) : les totaux, la serie et le calendrier le comptent. Ce qui
-- manquait, c'est lesquels : practice_session_exercises les rattache a
-- cette ligne, un exercice par ligne, avec son temps et son tempo.

-- Un exo express (monte a la volee dans la file) n'a pas de fiche : il ne
-- garde que son nom et sa categorie. Une fiche supprimee ne fait plus
-- disparaitre l'exercice de l'historique : le nom reste.
ALTER TABLE practice_session_exercises
  ALTER COLUMN exercise_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS exercise_name TEXT,
  ADD COLUMN IF NOT EXISTS exercise_category exercise_category;

UPDATE practice_session_exercises pse
SET exercise_name = e.name, exercise_category = e.category
FROM exercises e
WHERE e.id = pse.exercise_id AND pse.exercise_name IS NULL;

ALTER TABLE practice_session_exercises
  DROP CONSTRAINT IF EXISTS practice_session_exercises_exercise_id_fkey,
  ADD CONSTRAINT practice_session_exercises_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL;

ALTER TABLE practice_session_exercises
  DROP CONSTRAINT IF EXISTS practice_session_exercises_named,
  ADD CONSTRAINT practice_session_exercises_named
    CHECK (exercise_id IS NOT NULL OR exercise_name IS NOT NULL);
