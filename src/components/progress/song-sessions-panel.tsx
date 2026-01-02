"use client";

import { useState, useEffect } from "react";
import { getPracticeSessionsBySong, getSongPracticeStats } from "@/lib/actions/practice";
import { getMoodEmoji } from "./mood-selector";
import { getSectionsLabels } from "./sections-selector";
import type { PracticeSession, SongPracticeStats } from "@/types";

interface SongSessionsPanelProps {
  songId: string;
  onAddSession: () => void;
}

export function SongSessionsPanel({ songId, onAddSession }: SongSessionsPanelProps) {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [stats, setStats] = useState<SongPracticeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [sessionsData, statsData] = await Promise.all([
        getPracticeSessionsBySong(songId),
        getSongPracticeStats(songId),
      ]);
      setSessions(sessionsData);
      setStats(statsData);
      setLoading(false);
    };
    loadData();
  }, [songId]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeDate = (date: string): string => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffDays = Math.floor(
      (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
    return sessionDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats du morceau */}
      {stats && stats.totalSessions > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-xl font-bold">{stats.totalSessions}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Temps total</p>
            <p className="text-xl font-bold">{formatDuration(stats.totalMinutes)}</p>
          </div>
          {stats.bestBpm && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Meilleur BPM</p>
              <p className="text-xl font-bold text-primary">{stats.bestBpm}</p>
            </div>
          )}
          {stats.lastPracticed && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Dernière session</p>
              <p className="text-sm font-medium">{formatRelativeDate(stats.lastPracticed)}</p>
            </div>
          )}
        </div>
      )}

      {/* Liste des sessions */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Historique</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                {/* Mood emoji */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                  {session.mood ? getMoodEmoji(session.mood) : "🎸"}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDuration(session.duration_minutes)}</span>
                    {session.bpm_achieved && (
                      <span className="text-xs text-primary">{session.bpm_achieved} BPM</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(session.practiced_at)}</span>
                    {session.sections_worked.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{getSectionsLabels(session.sections_worked)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Objectifs atteints */}
                {session.goals_achieved && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Aucune session enregistrée</p>
        </div>
      )}

      {/* Bouton ajouter */}
      <button
        onClick={onAddSession}
        className="w-full rounded-lg border border-dashed border-primary py-3 text-sm font-medium text-primary transition-all hover:bg-primary/5"
      >
        + Ajouter une session de pratique
      </button>
    </div>
  );
}
