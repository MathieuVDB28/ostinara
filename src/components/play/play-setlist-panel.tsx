"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ListMusic } from "lucide-react";
import { PlayStepper, type PlayStep } from "./play-stepper";
import type {
  Song,
  SetlistWithDetails,
  SetlistItemWithSongOwner,
  ExerciseWithProgress,
  SongPracticeStats,
  UserPlan,
} from "@/types";

interface PlaySetlistPanelProps {
  setlists: SetlistWithDetails[];
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
  currentBpm: number;
  onRequestBpm: (bpm: number) => void;
  songWorkingBpm: (song: Song) => number | null;
  userPlan: UserPlan;
}

/** Les elements jouables d'une setlist : morceaux + exercices, pas les sections. */
function playableItems(
  setlist: SetlistWithDetails
): SetlistItemWithSongOwner[] {
  return setlist.items.filter(
    (item) => item.item_type === "song" || item.item_type === "exercise"
  );
}

/**
 * Jouer une setlist enregistree : on la choisit, puis on la deroule
 * element par element via le stepper partage.
 */
export function PlaySetlistPanel({
  setlists,
  songs,
  exercises,
  songPracticeStats,
  currentBpm,
  onRequestBpm,
  songWorkingBpm,
  userPlan,
}: PlaySetlistPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => setlists.find((s) => s.id === selectedId) ?? null,
    [setlists, selectedId]
  );

  const steps: PlayStep[] = useMemo(() => {
    if (!selected) return [];
    return playableItems(selected).map((item) =>
      item.item_type === "song"
        ? {
            key: item.id,
            kind: "song",
            song: item.song_id
              ? songs.find((s) => s.id === item.song_id) ?? null
              : null,
            songTitle: item.song_title,
            songArtist: item.song_artist,
            songCoverUrl: item.song_cover_url,
            exercise: null,
            bpm: item.bpm,
          }
        : {
            key: item.id,
            kind: "exercise",
            song: null,
            exercise: item.exercise_id
              ? exercises.find((e) => e.id === item.exercise_id) ?? null
              : null,
            exerciseName: item.exercise_name,
            exerciseCategory: item.exercise_category,
            notes: item.notes,
            bpm: item.bpm,
          }
    );
  }, [selected, songs, exercises]);

  // --- Sans setlist : le selecteur ---
  if (!selected) {
    if (setlists.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <ListMusic
            className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-sm font-medium">Aucune setlist à jouer</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Construis-en une dans Commu › Groupes, ou monte une file à la volée
            dans l&apos;onglet « File ».
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Choisis une setlist à dérouler : le métronome se cale sur chaque
          élément, le chrono tourne.
        </p>
        <div className="divide-y divide-border rounded-xl border border-border">
          {setlists.map((setlist) => {
            const count = playableItems(setlist).length;
            return (
              <button
                key={setlist.id}
                onClick={() => setSelectedId(setlist.id)}
                disabled={count === 0}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <ListMusic
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{setlist.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {count > 0
                      ? `${count} élément${count > 1 ? "s" : ""} à jouer`
                      : "Aucun morceau ni exercice"}
                    {setlist.band ? ` • ${setlist.band.name}` : ""}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Setlist choisie : le dérouleur partagé (remonté à chaque changement) ---
  return (
    <PlayStepper
      key={selected.id}
      steps={steps}
      title={selected.name}
      onBack={() => setSelectedId(null)}
      backLabel="← Changer de setlist"
      songPracticeStats={songPracticeStats}
      currentBpm={currentBpm}
      onRequestBpm={onRequestBpm}
      songWorkingBpm={songWorkingBpm}
      userPlan={userPlan}
    />
  );
}
