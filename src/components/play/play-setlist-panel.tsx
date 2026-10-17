"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ListMusic, Timer } from "lucide-react";
import { BpmTargetIndicator } from "@/components/practice/song-practice/bpm-target-indicator";
import { SongTabPanel } from "@/components/practice/song-practice/song-tab-panel";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
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
  /** Cale le metronome de la page sans changer de morceau. */
  onRequestBpm: (bpm: number) => void;
  /** Le meilleur tempo de travail d'un morceau (reprise, pas tempo du disque). */
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

function sessionSong(song: Song | null) {
  return song
    ? { title: song.title, artist: song.artist, cover_url: song.cover_url ?? null }
    : null;
}

/**
 * Jouer une setlist : on la deroule element par element.
 *
 * Le pendant live des setlists. On construit la liste (morceaux + exos)
 * dans « Commu › Groupes », on la deroule ici : le metronome se cale sur
 * chaque element, le chrono tourne, « Suivant » passe au suivant. Les
 * sections (Intro, Pause…) ne sont pas des choses qu'on « joue » : on les
 * saute.
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
  const practiceSession = usePracticeSession();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const selected = useMemo(
    () => setlists.find((s) => s.id === selectedId) ?? null,
    [setlists, selectedId]
  );
  const items = useMemo(
    () => (selected ? playableItems(selected) : []),
    [selected]
  );
  const current = items[index] ?? null;

  // Resout le morceau de la bibliotheque derriere un item (pour la tab et la
  // courbe de tempo). Un morceau d'un autre membre d'un groupe n'y est pas :
  // on retombe alors sur le simple instantane titre/artiste de l'item.
  const resolveSong = useCallback(
    (item: SetlistItemWithSongOwner | null): Song | null =>
      item?.song_id ? songs.find((s) => s.id === item.song_id) ?? null : null,
    [songs]
  );
  const resolveExercise = useCallback(
    (item: SetlistItemWithSongOwner | null): ExerciseWithProgress | null =>
      item?.exercise_id
        ? exercises.find((e) => e.id === item.exercise_id) ?? null
        : null,
    [exercises]
  );

  // Le tempo d'un element : son BPM propre d'abord, sinon le tempo de
  // travail du morceau / la cible de l'exo, sinon on ne touche pas au metro.
  const bpmFor = useCallback(
    (item: SetlistItemWithSongOwner | null): number | null => {
      if (!item) return null;
      if (item.bpm && item.bpm > 0) return item.bpm;
      if (item.item_type === "song") {
        const song = resolveSong(item);
        return song ? songWorkingBpm(song) : null;
      }
      return resolveExercise(item)?.target_bpm ?? null;
    },
    [resolveSong, resolveExercise, songWorkingBpm]
  );

  // Le metronome suit l'element courant, meme chrono a l'arret : on peut
  // feuilleter la setlist avant de lancer la session.
  useEffect(() => {
    if (!current) return;
    const bpm = bpmFor(current);
    if (bpm !== null) onRequestBpm(bpm);
    // onRequestBpm est stable (useCallback parent) ; on ne resynchronise
    // qu'au changement d'element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, index]);

  const pickSetlist = (id: string) => {
    setSelectedId(id);
    setIndex(0);
  };

  // Repercute l'element courant sur la session en cours : un morceau credite
  // son temps (session multi-morceaux), un exo bascule sur « sans morceau ».
  const syncSession = useCallback(
    (item: SetlistItemWithSongOwner | null) => {
      if (!practiceSession.isActive || !item) return;
      const bpm = bpmFor(item);
      if (item.item_type === "song") {
        const song = resolveSong(item);
        practiceSession.setSongId(
          song?.id ?? null,
          song ? sessionSong(song) : null
        );
      } else {
        practiceSession.setSongId(null, null);
      }
      if (bpm !== null) practiceSession.setBpm(bpm);
    },
    [practiceSession, bpmFor, resolveSong]
  );

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    setIndex(clamped);
    syncSession(items[clamped] ?? null);
  };

  const handleStart = () => {
    if (!current) return;
    const song = current.item_type === "song" ? resolveSong(current) : null;
    practiceSession.start({
      songId: song?.id ?? null,
      exerciseId:
        current.item_type === "exercise" ? current.exercise_id ?? null : null,
      bpm: bpmFor(current) ?? currentBpm,
      song: sessionSong(song),
      focus: false,
    });
  };

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
            Construis-en une dans Commu › Groupes (morceaux + exercices), puis
            reviens ici pour la dérouler.
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
                onClick={() => pickSetlist(setlist.id)}
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

  // --- Setlist choisie : le dérouleur ---
  const song = current?.item_type === "song" ? resolveSong(current) : null;
  const exercise =
    current?.item_type === "exercise" ? resolveExercise(current) : null;

  return (
    <div className="space-y-5">
      {/* En-tete : nom + position + changer */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => setSelectedId(null)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Changer de setlist
          </button>
          <h2 className="truncate font-display text-2xl font-extrabold uppercase leading-none">
            {selected.name}
          </h2>
        </div>
        <span className="tabular shrink-0 font-display text-lg font-bold text-muted-foreground">
          {index + 1}
          <span className="text-sm">/{items.length}</span>
        </span>
      </div>

      {/* Element courant */}
      {current ? (
        current.item_type === "song" ? (
          song ? (
            <div className="space-y-5">
              <BpmTargetIndicator
                song={song}
                currentBpm={currentBpm}
                practiceStats={songPracticeStats[song.id]}
              />
              <SongTabPanel
                song={song}
                currentBpm={currentBpm}
                onRequestBpm={onRequestBpm}
                userPlan={userPlan}
              />
            </div>
          ) : (
            // Morceau d'un autre membre (ou hors biblio) : l'instantane suffit.
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                {current.song_cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.song_cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{current.song_title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {current.song_artist}
                </p>
              </div>
            </div>
          )
        ) : (
          // Exercice
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                {current.exercise_category
                  ? EXERCISE_CATEGORY_LABELS[current.exercise_category]
                  : "Exercice"}
              </span>
              {bpmFor(current) && (
                <span className="tabular font-display text-base font-bold">
                  {bpmFor(current)}
                  <span className="text-xs text-muted-foreground"> bpm</span>
                </span>
              )}
            </div>
            <h3 className="font-display text-xl font-extrabold uppercase leading-none">
              {current.exercise_name}
            </h3>
            {exercise?.instructions && exercise.instructions.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {exercise.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
            {current.notes && (
              <p className="text-sm text-muted-foreground">{current.notes}</p>
            )}
          </div>
        )
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Cette setlist n&apos;a ni morceau ni exercice à jouer.
        </p>
      )}

      {/* Navigation + démarrage */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Précédent
        </button>

        {!practiceSession.isActive && (
          <button
            onClick={handleStart}
            disabled={!current}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Timer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Démarrer la session
          </button>
        )}

        <button
          onClick={() => goTo(index + 1)}
          disabled={index >= items.length - 1}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-40"
        >
          Suivant
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
