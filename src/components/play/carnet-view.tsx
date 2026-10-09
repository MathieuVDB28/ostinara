"use client";

import { Play } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";
import { WeeklyPlanCard } from "@/components/plan/weekly-plan-card";
import { songTempoProgress } from "@/lib/song-progress";
import { PracticeCalendar } from "./practice-calendar";
import type {
  HeatmapData,
  PracticeSessionWithSong,
  PracticeStats,
  Song,
  WeeklyPlan,
} from "@/types";

interface CarnetViewProps {
  stats: PracticeStats;
  calendar: HeatmapData;
  recentSessions: PracticeSessionWithSong[];
  weeklyPlan: WeeklyPlan | null;
  /** La carte « Reprendre », deja composee par PlayView. */
  resume: React.ReactNode;
  /** Le morceau en cours, quand il n'y a pas de derniere session a reprendre. */
  focusSong: Song | null;
  focusBestBpm: number | null;
  isPracticing: boolean;
  onStartSession: () => void;
  onWorkOnSong: (songId: string) => void;
}

/** « 17 h 40 » : les heures et les minutes, sans « 1060 min ». */
function splitMinutes(total: number) {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function formatWhen(practicedAt: string): string {
  const then = new Date(practicedAt);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return then.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Le Carnet : la page d'accueil de « Jouer », style Atelier
 * (docs/refonte-ui.md).
 *
 * Ce qu'on a fait (chiffres, calendrier, dernieres sessions) a cote de
 * ce qu'on va faire (reprendre, plan de la semaine). Un seul bouton
 * ambre : reprendre, ou a defaut demarrer.
 */
export function CarnetView({
  stats,
  calendar,
  recentSessions,
  weeklyPlan,
  resume,
  focusSong,
  focusBestBpm,
  isPracticing,
  onStartSession,
  onWorkOnSong,
}: CarnetViewProps) {
  const total = splitMinutes(stats.totalMinutes);
  const focusTempo = focusSong ? songTempoProgress(focusSong, focusBestBpm) : null;
  const focusPercent = focusTempo ? focusTempo.percent : focusSong?.progress_percent ?? 0;

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <Stat label="sessions" value={<>{stats.totalSessions}</>} />
          <Stat
            label="au total"
            value={
              <>
                {total.hours}
                <small className="text-[0.55em] text-muted-foreground">h</small>
                {total.minutes.toString().padStart(2, "0")}
              </>
            }
          />
          <Stat
            label={`série · record ${stats.longestStreak}`}
            value={
              <>
                {stats.currentStreak}
                <small className="text-[0.55em] text-muted-foreground">j</small>
              </>
            }
          />
          <Stat
            className="hidden sm:block"
            label="cette semaine"
            value={
              <>
                {stats.minutesThisWeek}
                <small className="text-[0.55em] text-muted-foreground"> min</small>
              </>
            }
          />
        </dl>

        <PracticeCalendar data={calendar} />

        {recentSessions.length > 0 && (
          <section aria-labelledby="recent-sessions">
            <h2
              id="recent-sessions"
              className="flex justify-between border-b border-border pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              <span>Dernières sessions</span>
              <span aria-hidden="true">durée</span>
            </h2>
            <ul>
              {recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5"
                >
                  <Cover src={session.song?.cover_url} className="h-11 w-11 rounded-[3px]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {session.song?.title ?? "Session libre"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatWhen(session.practiced_at)}
                      {session.bpm_achieved ? ` · ${session.bpm_achieved} bpm` : ""}
                    </p>
                  </div>
                  <span className="tabular font-display text-lg font-bold leading-none">
                    {session.duration_minutes}
                    <small className="text-xs font-semibold text-muted-foreground"> min</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="min-w-0 space-y-8">
        {resume}

        {/* Sans session a reprendre : le morceau en cours, et « Demarrer ». */}
        {!resume && (
          <section className="border-t border-border pt-4">
            {focusSong && (
              <button
                type="button"
                onClick={() => onWorkOnSong(focusSong.id)}
                className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5 text-left"
              >
                <Cover src={focusSong.cover_url} className="h-14 w-14 rounded-[4px]" />
                <span className="min-w-0">
                  <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    En cours
                  </span>
                  <span className="block truncate text-[15px] font-bold">{focusSong.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{focusSong.artist}</span>
                </span>
                <Frets value={focusPercent} label={`${focusPercent} %`} />
              </button>
            )}
            <button
              type="button"
              onClick={onStartSession}
              disabled={isPracticing}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Play className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
              {isPracticing ? "Session en cours" : "Démarrer une session"}
            </button>
          </section>
        )}

        {weeklyPlan && <WeeklyPlanCard plan={weeklyPlan} onWorkOnSong={onWorkOnSong} />}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col-reverse gap-1 ${className}`}>
      <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular font-display text-[32px] font-bold leading-none">{value}</dd>
    </div>
  );
}
