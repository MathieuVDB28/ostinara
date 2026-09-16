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
  beginner: "bg-success/20 text-success",
  intermediate: "bg-chart-2/20 text-chart-2",
  advanced: "bg-primary/20 text-primary",
  expert: "bg-destructive/20 text-destructive",
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

  const isFromFriend = exercise.is_from_friend;
  const isCustom = !exercise.is_system && !isFromFriend;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-lg ${
        isFromFriend
          ? "border-primary/30 bg-card hover:border-primary/60"
          : "border-border bg-card hover:border-primary/50"
      }`}
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

      {/* Category + Source badge */}
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {EXERCISE_CATEGORY_LABELS[exercise.category]}
        </p>
        {isFromFriend && exercise.creator_name && (
          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {exercise.creator_name}
          </span>
        )}
        {isCustom && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            Perso
          </span>
        )}
      </div>

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
          className={`h-full rounded-full transition-all ${
            isFromFriend ? "bg-primary" : "bg-primary"
          }`}
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
