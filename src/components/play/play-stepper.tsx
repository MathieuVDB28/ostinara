"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, History, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { BpmTargetIndicator } from "@/components/practice/song-practice/bpm-target-indicator";
import { SongTabPanel } from "@/components/practice/song-practice/song-tab-panel";
import { usePracticeSession, type SessionExercise } from "@/components/providers/practice-session-provider";
import type { SaveSessionItemInput } from "@/lib/actions/setlists";
import type {
  Song,
  ExerciseWithProgress,
  ExerciseCategory,
  SongPracticeStats,
  UserPlan,
} from "@/types";

/**
 * Un element a jouer dans un deroule, quelle que soit sa source (setlist
 * enregistree ou file montee a la volee). Un morceau porte soit le Song
 * resolu de la bibliotheque (tab + courbe de tempo), soit juste un
 * instantane titre/artiste ; un exercice porte l'exo resolu (consignes)
 * ou juste son nom (exo express).
 */
export interface PlayStep {
  key: string;
  kind: "song" | "exercise";
  song: Song | null;
  songTitle?: string;
  songArtist?: string;
  songCoverUrl?: string | null;
  exercise: ExerciseWithProgress | null;
  exerciseName?: string;
  exerciseCategory?: ExerciseCategory;
  notes?: string;
  /** BPM propre de l'element, prioritaire sur le tempo de travail. */
  bpm?: number | null;
}

interface PlayStepperProps {
  steps: PlayStep[];
  /** Titre du deroule (nom de setlist, « Ma file »…). */
  title: string;
  /** Action de retour (changer de setlist…). Absente = pas de bouton. */
  onBack?: () => void;
  backLabel?: string;
  songPracticeStats: Record<string, SongPracticeStats>;
  currentBpm: number;
  onRequestBpm: (bpm: number) => void;
  songWorkingBpm: (song: Song) => number | null;
  userPlan: UserPlan;
  /** Le deroule en version « a enregistrer » : propose routine/setlist en fin de session. */
  sessionItems?: SaveSessionItemInput[];
}

/** L'exercice d'une etape, tel que le chrono le compte. */
function sessionExercise(step: PlayStep): SessionExercise | null {
  if (step.kind !== "exercise") return null;
  const name = step.exercise?.name ?? step.exerciseName ?? "";
  if (!step.exercise && !name) return null;
  return {
    id: step.exercise?.id ?? null,
    name,
    category: step.exercise?.category ?? step.exerciseCategory ?? null,
  };
}

function sessionSong(song: Song | null) {
  return song
    ? { title: song.title, artist: song.artist, cover_url: song.cover_url ?? null }
    : null;
}

/**
 * Le deroule : element courant en grand, metronome cale dessus, chrono,
 * « Precedent / Suivant ».
 *
 * L'index est un state interne. Pour repartir de zero (autre setlist,
 * file videe), le parent change la `key` du composant : React remonte,
 * l'index redevient 0.
 */
export function PlayStepper({
  steps,
  title,
  onBack,
  backLabel,
  songPracticeStats,
  currentBpm,
  onRequestBpm,
  songWorkingBpm,
  userPlan,
  sessionItems,
}: PlayStepperProps) {
  const t = useTranslations("play.stepper");
  const te = useTranslations("enums");
  const practiceSession = usePracticeSession();
  const [index, setIndex] = useState(0);

  // L'index peut depasser si un element a ete retire : on le ramene dans
  // les clous au rendu plutot que de risquer un `current` fantome.
  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const current = steps[safeIndex] ?? null;

  const bpmFor = useCallback(
    (step: PlayStep | null): number | null => {
      if (!step) return null;
      if (step.bpm && step.bpm > 0) return step.bpm;
      if (step.kind === "song") {
        return step.song ? songWorkingBpm(step.song) : null;
      }
      return step.exercise?.target_bpm ?? null;
    },
    [songWorkingBpm]
  );

  // Le metronome suit l'element courant, chrono a l'arret comme en cours :
  // on peut feuilleter avant de lancer la session.
  useEffect(() => {
    if (!current) return;
    const bpm = bpmFor(current);
    if (bpm !== null) onRequestBpm(bpm);
    // Resynchronise seulement au changement d'element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, current?.key]);

  const syncSession = useCallback(
    (step: PlayStep | null) => {
      if (!practiceSession.isActive || !step) return;
      if (step.kind === "song") {
        practiceSession.setSongId(
          step.song?.id ?? null,
          step.song ? sessionSong(step.song) : null
        );
      } else {
        practiceSession.setExercise(sessionExercise(step));
      }
      const bpm = bpmFor(step);
      if (bpm !== null) practiceSession.setBpm(bpm);
    },
    [practiceSession, bpmFor]
  );

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, next));
    setIndex(clamped);
    syncSession(steps[clamped] ?? null);
  };

  const handleStart = () => {
    if (!current) return;
    practiceSession.start({
      songId: current.kind === "song" ? current.song?.id ?? null : null,
      exerciseId: current.kind === "exercise" ? current.exercise?.id ?? null : null,
      bpm: bpmFor(current) ?? currentBpm,
      song: current.kind === "song" ? sessionSong(current.song) : null,
      exercise: sessionExercise(current),
      focus: false,
      programItems: sessionItems,
    });
  };

  // Deja jouee : la session montee part dans la modale, morceaux compris.
  const handleAlreadyPlayed = () => {
    practiceSession.openPastSession(
      steps.flatMap((step) => (step.kind === "song" && step.song ? [step.song.id] : [])),
      steps.flatMap((step) => {
        const exercise = sessionExercise(step);
        return exercise ? [exercise] : [];
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* En-tete : titre + position (+ retour) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              {backLabel ?? t("back")}
            </button>
          )}
          <h2 className="truncate font-display text-2xl font-extrabold uppercase leading-none">
            {title}
          </h2>
        </div>
        {steps.length > 0 && (
          <span className="tabular shrink-0 font-display text-lg font-bold text-muted-foreground">
            {safeIndex + 1}
            <span className="text-sm">/{steps.length}</span>
          </span>
        )}
      </div>

      {/* Element courant */}
      {current ? (
        current.kind === "song" ? (
          current.song ? (
            <div className="space-y-5">
              <BpmTargetIndicator
                song={current.song}
                currentBpm={currentBpm}
                practiceStats={songPracticeStats[current.song.id]}
              />
              <SongTabPanel
                song={current.song}
                currentBpm={currentBpm}
                onRequestBpm={onRequestBpm}
                userPlan={userPlan}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                {current.songCoverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.songCoverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{current.songTitle}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {current.songArtist}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                {current.exerciseCategory
                  ? te(`exerciseCategory.${current.exerciseCategory}`)
                  : t("exercise")}
              </span>
              {bpmFor(current) && (
                <span className="tabular font-display text-base font-bold">
                  {bpmFor(current)}
                  <span className="text-xs text-muted-foreground"> {t("bpm")}</span>
                </span>
              )}
            </div>
            <h3 className="font-display text-xl font-extrabold uppercase leading-none">
              {current.exerciseName}
            </h3>
            {current.exercise?.instructions &&
              current.exercise.instructions.length > 0 && (
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {current.exercise.instructions.map((step, i) => (
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
          {t("nothing")}
        </p>
      )}

      {/* Navigation + démarrage */}
      {current && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("previous")}
          </button>

          {!practiceSession.isActive && (
            <button
              onClick={handleStart}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Timer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("start")}
            </button>
          )}

          <button
            onClick={() => goTo(safeIndex + 1)}
            disabled={safeIndex >= steps.length - 1}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-40"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {steps.length > 0 && !practiceSession.isActive && (
        <button
          type="button"
          onClick={handleAlreadyPlayed}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <History className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {t("alreadyPlayed")}
        </button>
      )}
    </div>
  );
}
