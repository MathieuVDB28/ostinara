"use client";

import type { PracticeStats } from "@/types";

interface StatsSummaryProps {
  stats: PracticeStats;
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Sessions totales */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 0 20px rgba(139, 92, 246, 0.08)" }}>
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
            <span className="text-xs font-medium">Sessions</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
        </div>
      </div>

      {/* Temps total */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 0 20px rgba(139, 92, 246, 0.08)" }}>
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">schedule</span>
            <span className="text-xs font-medium">Temps total</span>
          </div>
          <p className="text-2xl font-bold">{formatDuration(stats.totalMinutes)}</p>
        </div>
      </div>

      {/* Streak */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 0 20px rgba(139, 92, 246, 0.08)" }}>
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">local_fire_department</span>
            <span className="text-xs font-medium">Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{stats.currentStreak}</span>
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Record: {stats.longestStreak} jours
            </p>
          )}
        </div>
      </div>

      {/* Cette semaine */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 0 20px rgba(139, 92, 246, 0.08)" }}>
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="material-symbols-outlined text-[18px] text-purple-400">calendar_today</span>
            <span className="text-xs font-medium">Cette semaine</span>
          </div>
          <span className="text-2xl font-bold">{formatDuration(stats.minutesThisWeek)}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {stats.sessionsThisWeek} session{stats.sessionsThisWeek > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsSummaryCompact({ stats }: StatsSummaryProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
        </svg>
        {stats.totalSessions} sessions
      </span>
      <span className="flex items-center gap-1">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatDuration(stats.totalMinutes)}
      </span>
      {stats.currentStreak > 0 && (
        <span className="flex items-center gap-1 text-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
          {stats.currentStreak} jours
        </span>
      )}
    </div>
  );
}
