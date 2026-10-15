import type { PracticeSession, Song, WeeklyGoal } from "@/types";

/**
 * La mesure d'un objectif du plan de la semaine, a part des Server
 * Actions : l'ecran du plan et le cron des rappels lisent la meme chose.
 * Un rappel « il te reste 2 objectifs » qui ne compterait que les coches
 * relancerait quelqu'un qui a deja tenu ses objectifs au journal.
 */

/** Date locale en YYYY-MM-DD — jamais de conversion UTC, elle decale le lundi. */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface MeasureInput {
  weekSessions: PracticeSession[];
  bestBpm: Map<string, number>;
  songs: Map<string, Song>;
  weekCovers: number;
}

/** Ce que le journal dit d'un objectif, independamment de la coche. */
export function measure(goal: WeeklyGoal, input: MeasureInput): number {
  const { weekSessions, bestBpm, songs, weekCovers } = input;

  switch (goal.kind) {
    case "tempo":
      return goal.song_id ? bestBpm.get(goal.song_id) ?? 0 : 0;

    case "mastery":
      return goal.song_id && songs.get(goal.song_id)?.status === "mastered"
        ? 1
        : 0;

    case "song_start": {
      if (!goal.song_id) return 0;
      const status = songs.get(goal.song_id)?.status;
      return status === "learning" || status === "mastered" ? 1 : 0;
    }

    case "section":
      // Le detail ne porte pas la section : on compte les seances sur le
      // morceau, c'est la seule mesure honnete a notre portee.
      return weekSessions.filter((session) => session.song_id === goal.song_id)
        .length;

    case "minutes":
      return weekSessions.reduce(
        (total, session) => total + session.duration_minutes,
        0
      );

    case "days":
      return new Set(
        weekSessions.map((session) =>
          formatDateLocal(new Date(session.practiced_at))
        )
      ).size;

    case "cover":
      return weekCovers;

    default:
      return 0;
  }
}

/** Atteint au journal, ou coche a la main. */
export function isGoalDone(goal: WeeklyGoal, input: MeasureInput): boolean {
  return goal.completed_at !== null || measure(goal, input) >= (goal.target_value ?? 1);
}
