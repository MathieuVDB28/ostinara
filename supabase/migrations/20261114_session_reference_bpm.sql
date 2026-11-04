-- Migration: tempo de base d'une session saisie apres coup
--
-- Une session passee preremplit le tempo de chaque morceau avec sa cible. Ce
-- tempo n'a pas ete mesure : il ne doit faire avancer ni la progression, ni
-- les badges, ni les statistiques, qui lisent tous `bpm_achieved`. Il vit donc
-- dans sa propre colonne, et `bpm_achieved` reste vide tant que le musicien
-- n'a pas dit avoir tenu un tempo.

ALTER TABLE practice_sessions
  ADD COLUMN IF NOT EXISTS reference_bpm INTEGER;
