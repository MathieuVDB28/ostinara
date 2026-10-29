"use client";

import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { formatDuration as formatMinutes } from "./stats-summary";
import type { PracticeSessionWithSong } from "@/types";
import { GroupSessionCard, SessionCard } from "./session-card";
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

/** Une entree du journal : une session, ou une session a plusieurs morceaux. */
type JournalItem =
  | { kind: "single"; key: string; session: PracticeSessionWithSong }
  | { kind: "group"; key: string; sessions: PracticeSessionWithSong[] };

/**
 * Les lignes d'une meme session a plusieurs morceaux se reunissent en une
 * entree, a la place de la premiere. Le journal parle en sessions, comme
 * les totaux.
 */
function toJournalItems(sessions: PracticeSessionWithSong[]): JournalItem[] {
  const items: JournalItem[] = [];
  const groups = new Map<string, Extract<JournalItem, { kind: "group" }>>();

  for (const session of sessions) {
    const groupId = session.session_group_id;
    if (!groupId) {
      items.push({ kind: "single", key: session.id, session });
      continue;
    }
    const existing = groups.get(groupId);
    if (existing) {
      existing.sessions.push(session);
    } else {
      const item = { kind: "group" as const, key: groupId, sessions: [session] };
      groups.set(groupId, item);
      items.push(item);
    }
  }

  // Un groupe dont une seule ligne est chargee reste une ligne simple.
  return items.map((item) =>
    item.kind === "group" && item.sessions.length === 1
      ? { kind: "single", key: item.sessions[0].id, session: item.sessions[0] }
      : item
  );
}

export function SessionList({
  sessions,
  onSessionClick,
  onSessionDeleted,
}: SessionListProps) {
  const t = useTranslations("progress.session");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const { start, openManualEntry } = usePracticeSession();

  const formatDuration = (minutes: number): string => formatMinutes(minutes, tc);

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();

    if (dateOnly === todayOnly) return tc("relative.todayCap");
    if (dateOnly === yesterdayOnly) return tc("relative.yesterdayCap");

    // Cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString(intlLocale, { weekday: "long" });
    }

    // Plus ancien
    return date.toLocaleDateString(intlLocale, {
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
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        actions={[
          {
            label: t("startTimer"),
            icon: "timer",
            primary: true,
            onClick: () => start(),
          },
          {
            label: t("logPast"),
            icon: "edit",
            onClick: openManualEntry,
          },
        ]}
        hint={t("emptyHint")}
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
              {toJournalItems(group.sessions).map((item) =>
                item.kind === "group" ? (
                  /*
                    Session a plusieurs morceaux : une carte, chaque morceau
                    en sous-ligne. Modifier (ou toucher un morceau) corrige
                    toute la session, le temps de chaque morceau compris ;
                    supprimer la retire en entier.
                  */
                  <SwipeRow
                    key={item.key}
                    label={t("sessionOf", { date: new Date(item.sessions[0].practiced_at).toLocaleDateString(intlLocale) })}
                    actions={[
                      {
                        key: "edit",
                        label: tc("edit"),
                        icon: "edit",
                        tone: "neutral",
                        onAction: () => onSessionClick(item.sessions[0]),
                      },
                      {
                        key: "delete",
                        label: tc("delete"),
                        icon: "delete",
                        tone: "destructive",
                        confirm: true,
                        onAction: async () => {
                          const results = await Promise.all(
                            item.sessions.map((session) => deletePracticeSession(session.id))
                          );
                          item.sessions.forEach((session, index) => {
                            if (results[index].success) onSessionDeleted?.(session.id);
                          });
                        },
                      },
                    ]}
                  >
                    <GroupSessionCard sessions={item.sessions} onSessionClick={onSessionClick} />
                  </SwipeRow>
                ) : (
                <div key={item.key}>

                  {/*
                    Carte de session. Modifier et supprimer passaient tous
                    deux par EditSessionModal ; la suppression demande une
                    confirmation dans le tiroir meme — pas de boite de
                    dialogue native qui gele la page.
                  */}
                  <div>
                    <SwipeRow
                      label={t("sessionOf", { date: new Date(item.session.practiced_at).toLocaleDateString(intlLocale) })}
                      actions={[
                        {
                          key: "edit",
                          label: tc("edit"),
                          icon: "edit",
                          tone: "neutral",
                          onAction: () => onSessionClick(item.session),
                        },
                        {
                          key: "delete",
                          label: tc("delete"),
                          icon: "delete",
                          tone: "destructive",
                          confirm: true,
                          onAction: async () => {
                            const result = await deletePracticeSession(item.session.id);
                            if (result.success) onSessionDeleted?.(item.session.id);
                          },
                        },
                      ]}
                    >
                      <SessionCard
                        session={item.session}
                        onClick={() => onSessionClick(item.session)}
                      />
                    </SwipeRow>
                  </div>
                </div>
                )
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
