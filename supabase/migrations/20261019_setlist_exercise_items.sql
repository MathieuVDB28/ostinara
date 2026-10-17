-- Migration: des exercices dans les setlists (et donc dans le jam)
--
-- Jusqu'ici une setlist ne contenait que des morceaux et des separateurs
-- de section. On ajoute un troisieme type d'item : l'exercice, pour glisser
-- un echauffement, une gamme ou un travail de dexterite entre les morceaux.
--
-- Un item exercice peut pointer vers un exercice de la bibliotheque
-- (`exercise_id`) ou etre un exo "express" saisi a la volee (exercise_id
-- null, juste un nom). On stocke toujours un snapshot `exercise_name` /
-- `exercise_category` pour que l'item survive a la suppression de l'exo
-- source. Les colonnes existantes bpm, duration_seconds et notes sont
-- reutilisees telles quelles.

-- 1. Nouvelle valeur d'enum (hors de toute reference dans cette migration).
ALTER TYPE setlist_item_type ADD VALUE IF NOT EXISTS 'exercise';

-- 2. Colonnes snapshot sur les items.
ALTER TABLE setlist_items
  ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exercise_name text,
  ADD COLUMN IF NOT EXISTS exercise_category exercise_category;

COMMENT ON COLUMN setlist_items.exercise_id IS 'Exercice de la bibliotheque lie a cet item (null pour un exo express)';
COMMENT ON COLUMN setlist_items.exercise_name IS 'Snapshot du nom de l''exercice (survit a la suppression de l''exo source)';
COMMENT ON COLUMN setlist_items.exercise_category IS 'Snapshot de la categorie de l''exercice, pour l''icone et la couleur';
