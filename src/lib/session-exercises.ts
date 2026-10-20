import type { PracticeSessionExercise } from "@/types";

/**
 * Le nom des exercices d'une ligne de session, pour la titrer quand elle
 * n'a pas de morceau : « Gammes majeures, Alternate picking » dit plus
 * que « Session libre ». Null sans exercice.
 */
export function sessionExercisesLabel(session: { exercises?: PracticeSessionExercise[] | null }): string | null {
  const names = (session.exercises ?? [])
    .map((exercise) => exercise.exercise_name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : null;
}
