"use client";

import type { PracticeSessionWithSong } from "@/types";
import { getMoodEmoji } from "./mood-selector";
import { getSectionsLabels } from "./sections-selector";

interface SessionCardProps {
  session: PracticeSessionWithSong;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "À l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return sessionDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sectionsLabel = getSectionsLabels(session.sections_worked);
  const moodEmoji = getMoodEmoji(session.mood);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        {/* Cover du morceau ou icône générique */}
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {session.song?.cover_url ? (
            <img
              src={session.song.cover_url}
              alt={session.song.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
          )}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">
                {session.song?.title || "Session libre"}
              </h3>
              {session.song?.artist && (
                <p className="text-sm text-muted-foreground truncate">
                  {session.song.artist}
                </p>
              )}
            </div>

            {/* Mood emoji */}
            {moodEmoji && (
              <span className="text-xl flex-shrink-0" title={session.mood || ""}>
                {moodEmoji}
              </span>
            )}
          </div>

          {/* Détails */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {/* Durée */}
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(session.duration_minutes)}
            </span>

            {/* BPM */}
            {session.bpm_achieved && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                {session.bpm_achieved} BPM
              </span>
            )}

            {/* Heure */}
            <span>{formatTime(session.practiced_at)}</span>

            {/* Date relative */}
            <span className="text-muted-foreground/70">
              {formatRelativeTime(session.practiced_at)}
            </span>
          </div>

          {/* Sections */}
          {sectionsLabel && (
            <div className="mt-2">
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {sectionsLabel}
              </span>
            </div>
          )}

          {/* Notes preview */}
          {session.notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
              {session.notes}
            </p>
          )}

          {/* Objectifs atteints */}
          {session.goals_achieved && session.session_goals && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Objectifs atteints
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
