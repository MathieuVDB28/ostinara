"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import { toggleShareExercise, deleteExercise } from "@/lib/actions/exercises";
import type { ExerciseWithProgress, ExerciseDifficulty } from "@/types";

interface ExerciseDetailModalProps {
  exercise: ExerciseWithProgress;
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (exercise: ExerciseWithProgress, bpm: number) => void;
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

export function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onStartPractice,
}: ExerciseDetailModalProps) {
  const router = useRouter();
  const progress = exercise.user_progress;
  const startingBpm = progress?.current_bpm || exercise.starting_bpm;

  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwnExercise = !exercise.is_system && !exercise.is_from_friend;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = progress
    ? Math.min(
        100,
        ((progress.current_bpm - exercise.starting_bpm) /
          (exercise.target_bpm - exercise.starting_bpm)) *
          100
      )
    : 0;

  const handleToggleShare = async () => {
    setSharing(true);
    await toggleShareExercise(exercise.id);
    setSharing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await deleteExercise(exercise.id);
    setDeleting(false);
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold">{exercise.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {EXERCISE_CATEGORY_LABELS[exercise.category]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  DIFFICULTY_COLORS[exercise.difficulty]
                }`}
              >
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </span>
              {exercise.is_from_friend && exercise.creator_name && (
                <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Par {exercise.creator_name}
                </span>
              )}
              {isOwnExercise && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  Mon exercice
                </span>
              )}
            </div>
          </div>
          <button aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Description */}
          {exercise.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {exercise.description}
            </p>
          )}

          {/* BPM Progress */}
          <div className="mb-4 rounded-lg border border-border bg-accent/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Progression BPM</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-accent">
              <div
                className={`h-full rounded-full transition-all ${
                  exercise.is_from_friend ? "bg-violet-500" : "bg-primary"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{exercise.starting_bpm} BPM</span>
              <span className="font-medium text-primary">
                {progress?.current_bpm || exercise.starting_bpm} BPM actuel
              </span>
              <span>{exercise.target_bpm} BPM</span>
            </div>
          </div>

          {/* Stats si progression existe */}
          {progress && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border p-2 text-center">
                <div className="text-lg font-semibold text-primary">
                  {progress.best_bpm}
                </div>
                <div className="text-xs text-muted-foreground">Meilleur BPM</div>
              </div>
              <div className="rounded-lg border border-border p-2 text-center">
                <div className="text-lg font-semibold text-primary">
                  {progress.total_practice_minutes}
                </div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div className="rounded-lg border border-border p-2 text-center">
                <div className="text-lg font-semibold text-primary">
                  {progress.sessions_count}
                </div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold">Instructions</h3>
              <ol className="space-y-2">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {exercise.tips && exercise.tips.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold">Conseils</h3>
              <ul className="space-y-1">
                {exercise.tips.map((tip, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Métadonnées */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-accent px-2 py-1 text-xs">
              Signature: {exercise.time_signature}
            </span>
            <span className="rounded-md bg-accent px-2 py-1 text-xs">
              Durée: ~{exercise.duration_minutes} min
            </span>
            <span className="rounded-md bg-accent px-2 py-1 text-xs">
              Incrément: +{exercise.bpm_increment} BPM
            </span>
          </div>

          {/* Share & Delete for own exercises */}
          {isOwnExercise && (
            <div className="mt-4 space-y-3">
              {/* Share toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Partager avec mes amis</p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.shared_with_friends
                        ? "Vos amis peuvent voir cet exercice"
                        : "Exercice privé"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleShare}
                  disabled={sharing}
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                    exercise.shared_with_friends ? "bg-violet-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      exercise.shared_with_friends ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  confirmDelete
                    ? "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border-border text-muted-foreground hover:border-red-500/50 hover:text-red-400"
                }`}
              >
                {deleting
                  ? "Suppression..."
                  : confirmDelete
                    ? "Confirmer la suppression"
                    : "Supprimer cet exercice"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <button
            onClick={() => onStartPractice(exercise, startingBpm)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 ${
              exercise.is_from_friend ? "bg-violet-500" : "bg-primary"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            Pratiquer à {startingBpm} BPM
          </button>
        </div>
      </div>
    </div>
  );
}
