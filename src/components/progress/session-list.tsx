"use client";

import type { PracticeSessionWithSong } from "@/types";
import { SessionCard } from "./session-card";
import { SwipeRow } from "@/components/ui/swipe-row";
import { EmptyState } from "@/components/ui/empty-state";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import { deletePracticeSession } from "@/lib/actions/practice";

interface SessionListProps {
  sessions: PracticeSessionWithSong[];
  onSessionClick: (session: PracticeSessionWithSong) => void;
  /** Suppression par glissement : la liste rend la main pour rafraichir. */
  onSessionDeleted?: (sessionId: string) => void;
}

interface GroupedSessions {
  label: string;
  date: string;
  totalMinutes: number;
  sessions: PracticeSessionWithSong[];
}

export function SessionList({
  sessions,
  onSessionClick,
  onSessionDeleted,
}: SessionListProps) {
  const { start, openManualEntry } = usePracticeSession();

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
      <EmptyState
        icon="schedule"
        title="Aucune session"
        description="Une session, c'est une durée et un tempo. À partir de deux, la courbe de progression et la série quotidienne se remplissent toutes seules."
        actions={[
          {
            label: "Démarrer le chrono",
            icon: "timer",
            primary: true,
            onClick: () => start(),
          },
          {
            label: "Saisir une session passée",
            icon: "edit",
            onClick: openManualEntry,
          },
        ]}
        hint="Le chrono suit d'un écran à l'autre : tu peux lancer une session ici et continuer sur « Jouer »."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupedSessions.map((group) => (
        <div key={group.date}>
          {/*
            Un jour, un filet : style Atelier (docs/refonte-ui.md). La frise
            verticale a points decorait sans rien dire de plus que la date.
          */}
          <div className="flex items-baseline justify-between border-b border-border pb-1.5">
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </h3>
            <span className="tabular font-mono text-[10.5px] text-muted-foreground">
              {formatDuration(group.totalMinutes)}
            </span>
          </div>

          <div>
            <div>
              {group.sessions.map((session) => (
                <div key={session.id}>

                  {/*
                    Carte de session. Modifier et supprimer passaient tous
                    deux par EditSessionModal ; la suppression demande une
                    confirmation dans le tiroir meme — pas de boite de
                    dialogue native qui gele la page.
                  */}
                  <div>
                    <SwipeRow
                      label={`session du ${new Date(session.practiced_at).toLocaleDateString("fr-FR")}`}
                      actions={[
                        {
                          key: "edit",
                          label: "Modifier",
                          icon: "edit",
                          tone: "neutral",
                          onAction: () => onSessionClick(session),
                        },
                        {
                          key: "delete",
                          label: "Supprimer",
                          icon: "delete",
                          tone: "destructive",
                          confirm: true,
                          onAction: async () => {
                            const result = await deletePracticeSession(session.id);
                            if (result.success) onSessionDeleted?.(session.id);
                          },
                        },
                      ]}
                    >
                      <SessionCard
                        session={session}
                        onClick={() => onSessionClick(session)}
                      />
                    </SwipeRow>
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
