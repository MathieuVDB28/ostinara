import { rehearsalSongKey } from "@/lib/rehearsal-log";
import type {
  ExerciseWithProgress,
  PlannedItem,
  PlannedSession,
  RoutineItem,
  RoutineWithItems,
  SetlistWithDetails,
  Song,
} from "@/types";

interface Library {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  routines: RoutineWithItems[];
  setlists: SetlistWithDetails[];
}

/** La copie d'une routine ou d'une setlist (les separateurs ne se jouent pas). */
export function itemsOf(source: Pick<RoutineWithItems | SetlistWithDetails, "items">): PlannedItem[] {
  return source.items.flatMap((item): PlannedItem[] =>
    item.item_type === "song" || item.item_type === "exercise"
      ? [
          {
            item_type: item.item_type,
            song_id: item.song_id ?? undefined,
            song_title: item.song_title ?? undefined,
            song_artist: item.song_artist ?? undefined,
            song_cover_url: item.song_cover_url ?? undefined,
            exercise_id: item.exercise_id ?? undefined,
            exercise_name: item.exercise_name ?? undefined,
            exercise_category: item.exercise_category ?? undefined,
            bpm: item.bpm ?? undefined,
          },
        ]
      : []
  );
}

/**
 * Ce que « Jouer » charge pour une session planifiee. La routine ou la setlist
 * de l'organisateur est relue telle qu'elle est aujourd'hui ; l'invite part de
 * la copie. Un morceau se retrouve dans ma biblio par titre et artiste ;
 * `missing` compte ceux que je n'ai pas.
 */
export function plannedProgram(
  session: PlannedSession,
  { songs, exercises, routines, setlists }: Library
): { routine: RoutineWithItems; missing: number } {
  const source =
    routines.find((routine) => routine.id === session.routine_id) ??
    setlists.find((setlist) => setlist.id === session.setlist_id);
  const planned = source ? itemsOf(source) : session.items;

  const byKey = new Map(songs.map((song) => [rehearsalSongKey(song.title, song.artist), song]));
  const ownIds = new Set(songs.map((song) => song.id));
  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  let missing = 0;

  const items = planned.flatMap((item, position): RoutineItem[] => {
    const base = { ...item, id: `${session.id}-${position}`, routine_id: session.id, position, created_at: session.starts_at };
    if (item.item_type === "exercise") {
      // Un exercice que je n'ai pas se joue en exo express, par son nom.
      return [{ ...base, exercise_id: item.exercise_id && exerciseIds.has(item.exercise_id) ? item.exercise_id : undefined }];
    }
    const songId =
      item.song_id && ownIds.has(item.song_id)
        ? item.song_id
        : item.song_title
          ? byKey.get(rehearsalSongKey(item.song_title, item.song_artist))?.id
          : undefined;
    if (!songId) {
      missing++;
      return [];
    }
    return [{ ...base, song_id: songId }];
  });

  return {
    routine: {
      id: session.id,
      user_id: session.user_id,
      name: session.title,
      created_at: session.starts_at,
      updated_at: session.starts_at,
      items,
      song_count: items.filter((item) => item.item_type === "song").length,
      exercise_count: items.filter((item) => item.item_type === "exercise").length,
    },
    missing,
  };
}
