import type { Locale } from "@/i18n/config";
import type { Exercise } from "@/types";

/**
 * Un exercice dans la langue de l'utilisateur.
 *
 * Les exercices systeme sont ecrits en francais en base et portent leurs
 * traductions (colonne `translations`, migration 20261029). Ceux qu'un
 * musicien cree restent dans la langue ou il les a ecrits.
 */
export function localizeExercise<T extends Exercise>(exercise: T, locale: Locale): T {
  if (locale === "fr") return exercise;
  const translation = exercise.translations?.[locale];
  if (!translation) return exercise;
  return {
    ...exercise,
    name: translation.name || exercise.name,
    description: translation.description ?? exercise.description,
    instructions: translation.instructions ?? exercise.instructions,
    tips: translation.tips ?? exercise.tips,
  };
}
