"use client";

import type { ExerciseWithProgress } from "@/types";

interface ExerciseProgressProps {
  exercise: ExerciseWithProgress;
  currentBpm: number;
  className?: string;
}

export function ExerciseProgress({
  exercise,
  currentBpm,
  className = "",
}: ExerciseProgressProps) {
  const progress = exercise.user_progress;
  const progressPercent = Math.min(
    100,
    ((currentBpm - exercise.starting_bpm) /
      (exercise.target_bpm - exercise.starting_bpm)) *
      100
  );

  const isAtTarget = currentBpm >= exercise.target_bpm;
  const improvement = progress ? currentBpm - progress.current_bpm : 0;

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">{exercise.name}</h3>
        {isAtTarget && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Objectif atteint!
          </span>
        )}
      </div>

      {/* BPM Display */}
      <div className="mb-4 flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{currentBpm}</div>
          <div className="text-xs text-muted-foreground">BPM actuel</div>
        </div>

        {/* Arrow */}
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>

        <div className="text-center">
          <div className="text-3xl font-bold text-muted-foreground">
            {exercise.target_bpm}
          </div>
          <div className="text-xs text-muted-foreground">BPM cible</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{exercise.starting_bpm}</span>
          <span>{Math.round(progressPercent)}%</span>
          <span>{exercise.target_bpm}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-accent">
          <div
            className={`h-full rounded-full transition-all ${
              isAtTarget ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Improvement indicator */}
      {improvement !== 0 && (
        <div
          className={`mt-3 flex items-center justify-center gap-1 text-sm ${
            improvement > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          <svg
            className={`h-4 w-4 ${improvement > 0 ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
          <span>
            {improvement > 0 ? "+" : ""}
            {improvement} BPM depuis la dernière session
          </span>
        </div>
      )}

      {/* Stats */}
      {progress && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div className="text-center">
            <div className="text-lg font-semibold">{progress.best_bpm}</div>
            <div className="text-xs text-muted-foreground">Record</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{progress.sessions_count}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{progress.total_practice_minutes}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
        </div>
      )}

      {/* Next milestone */}
      {!isAtTarget && (
        <div className="mt-4 rounded-lg bg-accent/50 p-2 text-center text-sm text-muted-foreground">
          Prochain objectif: {Math.min(currentBpm + exercise.bpm_increment, exercise.target_bpm)} BPM
        </div>
      )}
    </div>
  );
}
