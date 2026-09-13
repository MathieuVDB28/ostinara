"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PracticeSessionWithSong, PracticeStats, Song, ChartData } from "@/types";
import { PracticeTimer } from "./practice-timer";
import { AddSessionModal } from "./add-session-modal";
import { EditSessionModal } from "./edit-session-modal";
import { SessionList } from "./session-list";
import { StatsSummary } from "./stats-summary";
import { StatsTab } from "./charts";

type TabType = "journal" | "stats";

interface ProgressViewProps {
  initialSessions: PracticeSessionWithSong[];
  initialStats: PracticeStats;
  songs: Song[];
  chartData: ChartData;
}

export function ProgressView({
  initialSessions,
  initialStats,
  songs,
  chartData,
}: ProgressViewProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState<TabType>("journal");

  // Synchroniser l'état avec les props quand elles changent (après router.refresh())
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  // State pour les modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState<"timer" | "manual">("manual");
  const [timerDuration, setTimerDuration] = useState<number | undefined>();
  const [timerSong, setTimerSong] = useState<Song | null>(null);
  const [selectedSession, setSelectedSession] = useState<PracticeSessionWithSong | null>(null);

  // Callback quand le timer se termine
  const handleTimerComplete = useCallback((duration: number, song: Song | null) => {
    setTimerDuration(duration);
    setTimerSong(song);
    setAddModalMode("timer");
    setIsAddModalOpen(true);
  }, []);

  // Ouvrir la modal d'ajout manuel
  const handleAddManual = useCallback(() => {
    setTimerDuration(undefined);
    setTimerSong(null);
    setAddModalMode("manual");
    setIsAddModalOpen(true);
  }, []);

  // Callback de succès
  const handleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Progression</h1>
            <p className="mt-1 text-muted-foreground">
              Tracke tes sessions de pratique et suis ta progression
            </p>
          </div>
          <button
            onClick={handleAddManual}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ajouter une session
          </button>
        </div>
      </div>

      {/* Stats résumé */}
      <div className="mb-8">
        <StatsSummary stats={stats} />
      </div>

      {/* Onglets */}
      <div className="mb-6 flex gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab("journal")}
          className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors ${
            activeTab === "journal"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          Journal
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors ${
            activeTab === "stats"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
          Statistiques
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "journal" ? (
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Timer */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Timer de pratique</h2>
            <PracticeTimer songs={songs} onComplete={handleTimerComplete} />

            {/* Morceau le plus pratiqué */}
            {stats.mostPracticedSong && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Morceau le plus pratiqué
                </p>
                <div className="flex items-center gap-3">
                  {stats.mostPracticedSong.song.cover_url ? (
                    <Image
                      src={stats.mostPracticedSong.song.cover_url}
                      alt={stats.mostPracticedSong.song.title}
                      className="h-12 w-12 rounded-lg object-cover"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{stats.mostPracticedSong.song.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.mostPracticedSong.count} session{stats.mostPracticedSong.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historique */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Historique</h2>
            <SessionList
              sessions={sessions}
              onSessionClick={(session) => setSelectedSession(session)}
            />
          </div>
        </div>
      ) : (
        <StatsTab data={chartData} />
      )}

      {/* Modal d'ajout */}
      <AddSessionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
        songs={songs}
        timerDuration={timerDuration}
        timerSong={timerSong}
        mode={addModalMode}
      />

      {/* Modal d'édition */}
      <EditSessionModal
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        onSuccess={handleSuccess}
        songs={songs}
      />
    </div>
  );
}
