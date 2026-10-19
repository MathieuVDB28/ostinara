"use client";

import { Frets } from "@/components/ui/frets";
import { useTranslations } from "next-intl";
import type { ExerciseWithProgress } from "@/types";

interface ExerciseCardProps {
  exercise: ExerciseWithProgress;
  onClick: () => void;
}

/* Deux lettres de la categorie, a la place d'une icone dans une pastille : enums.exerciseMark. */

/**
 * Un exercice, en ligne a filet (style Atelier, docs/refonte-ui.md).
 *
 * A droite, la seule chose qui compte en travaillant : le tempo tenu
 * rapporte a la cible, en chiffres et en douze frettes. La plage de
 * l'exercice (60 → 120) se lit dans la ligne de detail.
 */
export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const t = useTranslations("exercises.card");
  const te = useTranslations("enums");
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
        {te(`exerciseMark.${exercise.category}`)}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{exercise.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {te(`exerciseCategory.${exercise.category}`)} · {te(`difficulty.${exercise.difficulty}`)} ·{" "}
          {t("duration", { m: exercise.duration_minutes })} ·{" "}
          <span className="tabular font-mono text-[10.5px]">
            {exercise.starting_bpm}→{exercise.target_bpm}
          </span>
          {isFromFriend && exercise.creator_name && <> · {t("from", { name: exercise.creator_name })}</>}
          {isCustom && <> · {t("custom")}</>}
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
              ? t("bpmOf", { current: progress.current_bpm, target: exercise.target_bpm })
              : t("notYet")
          }
        />
      </span>
    </button>
  );
}
