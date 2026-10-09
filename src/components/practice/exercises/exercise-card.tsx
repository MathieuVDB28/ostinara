"use client";

import { Frets } from "@/components/ui/frets";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import type { ExerciseWithProgress, ExerciseDifficulty, ExerciseCategory } from "@/types";

interface ExerciseCardProps {
  exercise: ExerciseWithProgress;
  onClick: () => void;
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

/** Deux lettres de la categorie, a la place d'une icone dans une pastille. */
const CATEGORY_MARK: Record<ExerciseCategory, string> = {
  scales: "GA",
  arpeggios: "AR",
  picking: "PI",
  chord_changes: "AC",
  fingerstyle: "FI",
  technique: "TE",
  rhythm: "RY",
};

/**
 * Un exercice, en ligne a filet (style Atelier, docs/refonte-ui.md).
 *
 * A droite, la seule chose qui compte en travaillant : le tempo tenu
 * rapporte a la cible, en chiffres et en douze frettes. La plage de
 * l'exercice (60 → 120) se lit dans la ligne de detail.
 */
export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const progress = exercise.user_progress;
  const span = exercise.target_bpm - exercise.starting_bpm;
  const progressPercent =
    progress && span > 0
      ? Math.max(0, Math.min(100, ((progress.current_bpm - exercise.starting_bpm) / span) * 100))
      : 0;

  const isFromFriend = exercise.is_from_friend;
  const isCustom = !exercise.is_system && !isFromFriend;

  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-secondary font-display text-[15px] font-extrabold text-muted-foreground"
      >
        {CATEGORY_MARK[exercise.category]}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{exercise.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {EXERCISE_CATEGORY_LABELS[exercise.category]} · {DIFFICULTY_LABELS[exercise.difficulty]} · ~
          {exercise.duration_minutes} min ·{" "}
          <span className="tabular font-mono text-[10.5px]">
            {exercise.starting_bpm}→{exercise.target_bpm}
          </span>
          {isFromFriend && exercise.creator_name && <> · de {exercise.creator_name}</>}
          {isCustom && <> · perso</>}
        </span>
      </span>

      <span className="grid justify-items-end gap-1">
        <span className="tabular font-display text-lg font-bold leading-none">
          {progress ? (
            <>
              {progress.current_bpm}
              <span className="text-xs text-muted-foreground">/{exercise.target_bpm}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        <Frets
          value={progressPercent}
          label={
            progress
              ? `${progress.current_bpm} sur ${exercise.target_bpm} BPM`
              : "Pas encore travaillé"
          }
        />
      </span>
    </button>
  );
}
