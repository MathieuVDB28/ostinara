"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Metronome } from "./metronome/metronome";
import { ExerciseList } from "./exercises/exercise-list";
import { ExerciseDetailModal } from "./exercises/exercise-detail-modal";
import { ExerciseProgress } from "./exercises/exercise-progress";
import { SongSelector } from "./song-practice/song-selector";
import { BpmTargetIndicator } from "./song-practice/bpm-target-indicator";
import { updateUserExerciseProgress } from "@/lib/actions/exercises";
import { updateSong } from "@/lib/actions/songs";
import type { Song, ExerciseWithProgress, SongPracticeStats } from "@/types";

interface PracticeViewProps {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
}

type ActiveTab = "song" | "exercises";
type SessionState = "idle" | "practicing";

export function PracticeView({
  songs,
  exercises,
  songPracticeStats,
}: PracticeViewProps) {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("song");

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Selection state
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithProgress | null>(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  // Metronome state
  const [currentBpm, setCurrentBpm] = useState(120);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);

  // Timer interval
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Start session
  const startSession = useCallback(() => {
    setSessionState("practicing");
    setSessionStartTime(new Date());
    setSessionDuration(0);

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  }, []);

  // Stop session
  const stopSession = useCallback(async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const durationMinutes = Math.max(1, Math.ceil(sessionDuration / 60));

    // Sauvegarder la progression de l'exercice si sélectionné
    if (selectedExercise) {
      await updateUserExerciseProgress({
        exercise_id: selectedExercise.id,
        current_bpm: currentBpm,
        duration_minutes: durationMinutes,
        bpm_achieved: currentBpm,
      });
    }

    // Reset state
    setSessionState("idle");
    setSessionStartTime(null);
    setSessionDuration(0);
    setTimerInterval(null);

    // Refresh data
    router.refresh();
  }, [timerInterval, sessionDuration, selectedExercise, currentBpm, router]);

  // Cancel session
  const cancelSession = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setSessionState("idle");
    setSessionStartTime(null);
    setSessionDuration(0);
    setTimerInterval(null);
  }, [timerInterval]);

  // Handle exercise selection from modal
  const handleStartExercisePractice = useCallback(
    (exercise: ExerciseWithProgress, bpm: number) => {
      setSelectedExercise(exercise);
      setCurrentBpm(bpm);
      setExerciseModalOpen(false);
      setActiveTab("exercises");
    },
    []
  );

  // Handle song target BPM update
  const handleUpdateTargetBpm = useCallback(
    async (songId: string, targetBpm: number) => {
      await updateSong(songId, { target_bpm: targetBpm });
      router.refresh();
    },
    [router]
  );

  // Format duration
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mode Practice</h1>
          <p className="text-muted-foreground">
            Métronome intégré et exercices structurés
          </p>
        </div>

        {sessionState === "idle" ? (
          <button
            onClick={startSession}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:opacity-90"
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Démarrer une session
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-primary/20 px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="font-mono text-lg font-semibold">
                {formatDuration(sessionDuration)}
              </span>
            </div>
            <button
              onClick={stopSession}
              className="rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition-colors hover:bg-green-600"
            >
              Terminer
            </button>
            <button
              onClick={cancelSession}
              className="rounded-lg border border-border px-4 py-2 font-medium transition-colors hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Metronome */}
        <Metronome
          initialBpm={currentBpm}
          onBpmChange={setCurrentBpm}
          onPlayingChange={setIsMetronomePlaying}
        />

        {/* Content area */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("song")}
              className={`flex-1 rounded-lg py-2 font-medium transition-colors ${
                activeTab === "song"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent"
              }`}
            >
              Morceau
            </button>
            <button
              onClick={() => setActiveTab("exercises")}
              className={`flex-1 rounded-lg py-2 font-medium transition-colors ${
                activeTab === "exercises"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent"
              }`}
            >
              Exercices
            </button>
          </div>

          {/* Tab content */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            {activeTab === "song" && (
              <div className="space-y-4">
                {selectedSong ? (
                  <BpmTargetIndicator
                    song={selectedSong}
                    currentBpm={currentBpm}
                    practiceStats={songPracticeStats[selectedSong.id]}
                  />
                ) : (
                  <div className="mb-4 rounded-lg bg-accent/50 p-4 text-center text-sm text-muted-foreground">
                    Sélectionnez un morceau pour voir votre progression
                  </div>
                )}

                <SongSelector
                  songs={songs}
                  selectedSong={selectedSong}
                  onSelectSong={setSelectedSong}
                  onUpdateTargetBpm={handleUpdateTargetBpm}
                />
              </div>
            )}

            {activeTab === "exercises" && (
              <div className="space-y-4">
                {selectedExercise && sessionState === "practicing" && (
                  <ExerciseProgress
                    exercise={selectedExercise}
                    currentBpm={currentBpm}
                    className="mb-4"
                  />
                )}

                <ExerciseList
                  exercises={exercises}
                  onSelectExercise={(exercise) => {
                    setSelectedExercise(exercise);
                    setExerciseModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session summary bar */}
      {sessionState === "practicing" && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 lg:left-64">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm text-muted-foreground">Session en cours</span>
              </div>
              <span className="font-mono text-lg font-semibold">
                {formatDuration(sessionDuration)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {selectedSong && (
                <span className="text-muted-foreground">
                  {selectedSong.title} - {selectedSong.artist}
                </span>
              )}
              {selectedExercise && (
                <span className="text-muted-foreground">
                  {selectedExercise.name}
                </span>
              )}
              <span className="font-medium text-primary">{currentBpm} BPM</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={stopSession}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                Terminer et enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isOpen={exerciseModalOpen}
          onClose={() => setExerciseModalOpen(false)}
          onStartPractice={handleStartExercisePractice}
        />
      )}
    </div>
  );
}
