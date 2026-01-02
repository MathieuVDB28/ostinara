"use client";

import type { PracticeSessionWithSong } from "@/types";
import { SessionCard } from "./session-card";

interface SessionListProps {
  sessions: PracticeSessionWithSong[];
  onSessionClick: (session: PracticeSessionWithSong) => void;
}

interface GroupedSessions {
  label: string;
  date: string;
  totalMinutes: number;
  sessions: PracticeSessionWithSong[];
}

export function SessionList({ sessions, onSessionClick }: SessionListProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();

    if (dateOnly === todayOnly) return "Aujourd'hui";
    if (dateOnly === yesterdayOnly) return "Hier";

    // Cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString("fr-FR", { weekday: "long" });
    }

    // Plus ancien
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // Grouper les sessions par jour
  const groupedSessions: GroupedSessions[] = sessions.reduce((groups, session) => {
    const dateKey = new Date(session.practiced_at).toDateString();
    const existingGroup = groups.find((g) => g.date === dateKey);

    if (existingGroup) {
      existingGroup.sessions.push(session);
      existingGroup.totalMinutes += session.duration_minutes;
    } else {
      groups.push({
        label: getDateLabel(session.practiced_at),
        date: dateKey,
        totalMinutes: session.duration_minutes,
        sessions: [session],
      });
    }

    return groups;
  }, [] as GroupedSessions[]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Aucune session</h3>
        <p className="max-w-sm text-center text-muted-foreground">
          Lance le timer ou ajoute une session manuellement pour commencer a tracker ta progression.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedSessions.map((group) => (
        <div key={group.date}>
          {/* Header du groupe */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold capitalize">{group.label}</h3>
            <span className="text-sm text-muted-foreground">
              Total: {formatDuration(group.totalMinutes)}
            </span>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            {/* Sessions */}
            <div className="space-y-3">
              {group.sessions.map((session, index) => (
                <div key={session.id} className="relative flex gap-4">
                  {/* Point sur la timeline */}
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    <div
                      className={`
                        h-3 w-3 rounded-full
                        ${index === 0 ? "bg-primary" : "bg-muted-foreground/50"}
                      `}
                    />
                  </div>

                  {/* Carte de session */}
                  <div className="flex-1 pb-1">
                    <SessionCard
                      session={session}
                      onClick={() => onSessionClick(session)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
