"use client";

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
      <div className="mb-6">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("journal")}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === "journal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Journal
            </span>
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === "stats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Statistiques
            </span>
          </button>
        </div>
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
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Morceau le plus pratiqué
                </p>
                <div className="flex items-center gap-3">
                  {stats.mostPracticedSong.song.cover_url ? (
                    <img
                      src={stats.mostPracticedSong.song.cover_url}
                      alt={stats.mostPracticedSong.song.title}
                      className="h-12 w-12 rounded-lg object-cover"
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
