"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Metronome } from "@/components/practice/metronome/metronome";
import { ExerciseList } from "@/components/practice/exercises/exercise-list";
import { ExerciseDetailModal } from "@/components/practice/exercises/exercise-detail-modal";
import { ExerciseProgress } from "@/components/practice/exercises/exercise-progress";
import { CreateExerciseModal } from "@/components/practice/exercises/create-exercise-modal";
import { SongSelector } from "@/components/practice/song-practice/song-selector";
import { BpmTargetIndicator } from "@/components/practice/song-practice/bpm-target-indicator";
import { GuitarTuner } from "@/components/audio/guitar-tuner";
import { SongIdentifier } from "@/components/audio/song-identifier";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { TempoLadder, ProgressBar } from "@/components/ui/tempo-ladder";
import { NavIcon } from "@/components/layout/nav-icon";
import { updateUserExerciseProgress } from "@/lib/actions/exercises";
import { updateSong } from "@/lib/actions/songs";
import type { Song, ExerciseWithProgress, SongPracticeStats } from "@/types";

type PlayTab = "song" | "exercises" | "tuner";
type SessionState = "idle" | "practicing";

const TABS: { value: PlayTab; label: string; icon: string }[] = [
  { value: "song", label: "Morceau", icon: "library" },
  { value: "exercises", label: "Exercices", icon: "exercise" },
  { value: "tuner", label: "Accordeur", icon: "tuner" },
];

interface PlayViewProps {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
  displayName: string;
  currentFocus: Song | null;
  focusBestBpm: number | null;
  isPaid: boolean;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayView({
  songs,
  exercises,
  songPracticeStats,
  displayName,
  currentFocus,
  focusBestBpm,
  isPaid,
}: PlayViewProps) {
  const router = useRouter();

  // Les segments de "Jouer" sont du state, pas des routes : le metronome
  // et le chrono doivent survivre au passage d'un segment a l'autre.
  const [activeTab, setActiveTab] = useState<PlayTab>("song");

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [sessionDuration, setSessionDuration] = useState(0);

  const [selectedSong, setSelectedSong] = useState<Song | null>(currentFocus);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseWithProgress | null>(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [createExerciseModalOpen, setCreateExerciseModalOpen] = useState(false);

  const [currentBpm, setCurrentBpm] = useState(120);

  const firstName = displayName.split(" ")[0];
  const focusTargetBpm =
    currentFocus?.target_bpm ??
    (currentFocus?.spotify_bpm ? Math.round(currentFocus.spotify_bpm) : undefined);

  // Le chrono vit dans un effet : un setInterval garde en state survivait
  // au demontage et continuait a tourner apres la navigation.
  useEffect(() => {
    if (sessionState !== "practicing") return;

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState]);

  const startSession = useCallback(() => {
    setSessionDuration(0);
    setSessionState("practicing");
  }, []);

  const stopSession = useCallback(async () => {
    const durationMinutes = Math.max(1, Math.ceil(sessionDuration / 60));

    if (selectedExercise) {
      await updateUserExerciseProgress({
        exercise_id: selectedExercise.id,
        current_bpm: currentBpm,
        duration_minutes: durationMinutes,
        bpm_achieved: currentBpm,
      });
    }

    setSessionState("idle");
    setSessionDuration(0);
    router.refresh();
  }, [sessionDuration, selectedExercise, currentBpm, router]);

  const cancelSession = useCallback(() => {
    setSessionState("idle");
    setSessionDuration(0);
  }, []);

  const handleStartExercisePractice = useCallback(
    (exercise: ExerciseWithProgress, bpm: number) => {
      setSelectedExercise(exercise);
      setCurrentBpm(bpm);
      setExerciseModalOpen(false);
      setActiveTab("exercises");
    },
    []
  );

  const handleUpdateTargetBpm = useCallback(
    async (songId: string, targetBpm: number) => {
      await updateSong(songId, { target_bpm: targetBpm });
      router.refresh();
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold lg:text-3xl">
            Salut, {firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Métronome, exercices et accordeur
          </p>
        </div>

        {sessionState === "idle" ? (
          <button
            onClick={startSession}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[20px]">timer</span>
            Démarrer une session
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-primary/20 px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="font-mono text-lg font-semibold">
                {formatDuration(sessionDuration)}
              </span>
            </div>
            <button
              onClick={stopSession}
              className="min-h-[44px] rounded-xl bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
            >
              Terminer
            </button>
            <button
              onClick={cancelSession}
              className="min-h-[44px] rounded-xl border border-border px-4 py-2 font-medium transition-colors hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Morceau en cours : la carte qui ouvrait le dashboard */}
      {currentFocus && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            En cours
          </p>
          <div className="flex items-center gap-4">
            {currentFocus.cover_url ? (
              <Image
                src={currentFocus.cover_url}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
                width={64}
                height={64}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <span className="material-symbols-outlined text-2xl text-primary">
                  music_note
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{currentFocus.title}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {currentFocus.artist}
              </p>
              <div className="mt-2">
                {focusTargetBpm ? (
                  <TempoLadder
                    targetBpm={focusTargetBpm}
                    achievedBpm={focusBestBpm}
                    showScale={false}
                  />
                ) : (
                  <ProgressBar percent={currentFocus.progress_percent} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-accent/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <NavIcon icon={tab.icon} className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === "tuner" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card">
            <GuitarTuner />
          </div>

          {/* L'identification de morceau reste une fonction payante */}
          {isPaid ? (
            <div className="rounded-2xl border border-border bg-card">
              <SongIdentifier />
            </div>
          ) : (
            <ProUpsell
              feature="Reconnaissance audio"
              description="Identifie n'importe quel morceau en quelques secondes. Disponible avec les plans Pro et Band."
            />
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <Metronome
            initialBpm={currentBpm}
            onBpmChange={setCurrentBpm}
            onPlayingChange={() => {}}
          />

          <div className="rounded-2xl border border-border bg-card/50 p-4">
            {activeTab === "song" && (
              <div className="space-y-4">
                {selectedSong ? (
                  <BpmTargetIndicator
                    song={selectedSong}
                    currentBpm={currentBpm}
                    practiceStats={songPracticeStats[selectedSong.id]}
                  />
                ) : (
                  <div className="rounded-lg bg-accent/50 p-4 text-center text-sm text-muted-foreground">
                    Sélectionne un morceau pour voir ta progression
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
                  onCreateExercise={() => setCreateExerciseModalOpen(true)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barre de session : au-dessus de la barre d'onglets, pas dessous */}
      {sessionState === "practicing" && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-border bg-card p-4 lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="font-mono text-lg font-semibold">
                {formatDuration(sessionDuration)}
              </span>
              <span className="text-sm font-medium text-primary">
                {currentBpm} BPM
              </span>
            </div>

            <button
              onClick={stopSession}
              className="min-h-[44px] rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Terminer et enregistrer
            </button>
          </div>
        </div>
      )}

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isOpen={exerciseModalOpen}
          onClose={() => setExerciseModalOpen(false)}
          onStartPractice={handleStartExercisePractice}
        />
      )}

      <CreateExerciseModal
        isOpen={createExerciseModalOpen}
        onClose={() => setCreateExerciseModalOpen(false)}
      />
    </div>
  );
}
