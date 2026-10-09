"use client";

import { CircleCheck } from "lucide-react";
import { Cover } from "@/components/ui/cover";
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

  const meta = [
    formatRelativeTime(session.practiced_at),
    formatTime(session.practiced_at),
    session.bpm_achieved ? `${session.bpm_achieved} bpm` : null,
    sectionsLabel || null,
  ].filter(Boolean);

  /*
   * Une ligne du journal, style Atelier (docs/refonte-ui.md) : la duree
   * en condense a droite comme dans le Carnet, la note du guitariste en
   * serif sous le titre. Plus de carte ni d'ombre au survol.
   */
  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Cover src={session.song?.cover_url} className="h-12 w-12 rounded-[3px]" />

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {session.song?.title || "Session libre"}
          {session.song?.artist && (
            <span className="font-normal text-muted-foreground"> · {session.song.artist}</span>
          )}
        </span>
        <span className="tabular block truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
        {session.notes && (
          <span className="mt-1 line-clamp-1 block font-serif text-[13.5px] italic text-foreground/80">
            {session.notes}
          </span>
        )}
        {session.goals_achieved && session.session_goals && (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Objectifs atteints
          </span>
        )}
      </span>

      <span className="flex flex-col items-end gap-1">
        <span className="tabular font-display text-xl font-bold leading-none">
          {formatDuration(session.duration_minutes)}
        </span>
        {moodEmoji && (
          <span className="text-base" title={session.mood || ""}>
            {moodEmoji}
          </span>
        )}
      </span>
    </button>
  );
}
