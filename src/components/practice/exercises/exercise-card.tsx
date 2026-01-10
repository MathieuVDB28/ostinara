"use client";

import { EXERCISE_CATEGORY_LABELS } from "@/types";
import type { ExerciseWithProgress, ExerciseDifficulty } from "@/types";

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

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
  beginner: "bg-green-500/20 text-green-400",
  intermediate: "bg-blue-500/20 text-blue-400",
  advanced: "bg-orange-500/20 text-orange-400",
  expert: "bg-red-500/20 text-red-400",
};

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const progress = exercise.user_progress;
  const progressPercent = progress
    ? Math.min(
        100,
        ((progress.current_bpm - exercise.starting_bpm) /
          (exercise.target_bpm - exercise.starting_bpm)) *
          100
      )
    : 0;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-medium leading-tight">{exercise.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            DIFFICULTY_COLORS[exercise.difficulty]
          }`}
        >
          {DIFFICULTY_LABELS[exercise.difficulty]}
        </span>
      </div>

      {/* Category */}
      <p className="mb-3 text-xs text-muted-foreground">
        {EXERCISE_CATEGORY_LABELS[exercise.category]}
      </p>

      {/* BPM Progress */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {progress ? `${progress.current_bpm} BPM` : `${exercise.starting_bpm} BPM`}
        </span>
        <span className="text-muted-foreground">Cible: {exercise.target_bpm} BPM</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats */}
      {progress && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {progress.total_practice_minutes} min
          </span>
          <span className="flex items-center gap-1">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Best: {progress.best_bpm} BPM
          </span>
          <span className="flex items-center gap-1">
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {progress.sessions_count}x
          </span>
        </div>
      )}

      {/* Time signature badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
          {exercise.time_signature}
        </span>
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
          ~{exercise.duration_minutes} min
        </span>
      </div>
    </button>
  );
}
