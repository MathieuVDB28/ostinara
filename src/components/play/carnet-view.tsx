"use client";

import { History, Play, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { CommonT } from "@/i18n/types";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";
import { WeeklyPlanCard } from "@/components/plan/weekly-plan-card";
import { songTempoProgress } from "@/lib/song-progress";
import { sessionExercisesLabel } from "@/lib/session-exercises";
import { PracticeCalendar } from "./practice-calendar";
import type {
  HeatmapData,
  PracticeSessionWithSong,
  PracticeStats,
  RoutineWithItems,
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
  /** Ajouter une session jouee sans chrono (hier, en repete, chez un ami…). */
  onAddPastSession: () => void;
  onWorkOnSong: (songId: string) => void;
  /** Les routines a relancer en un clic. */
  routines: RoutineWithItems[];
  onPlayRoutine: (routine: RoutineWithItems) => void;
  onDeleteRoutine: (routineId: string) => void;
  /** Nombre d'elements dans la derniere session montee (0 = aucune). */
  lastSessionCount: number;
  onResumeSession: () => void;
}

/** « 17 h 40 » : les heures et les minutes, sans « 1060 min ». */
function splitMinutes(total: number) {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function formatWhen(practicedAt: string, t: CommonT, intlLocale: string): string {
  const then = new Date(practicedAt);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return t("relative.today");
  if (days === 1) return t("relative.yesterday");
  if (days < 7) return t("relative.daysAgoShort", { count: days });
  return then.toLocaleDateString(intlLocale, { day: "numeric", month: "short" });
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
  onAddPastSession,
  onWorkOnSong,
  routines,
  onPlayRoutine,
  onDeleteRoutine,
  lastSessionCount,
  onResumeSession,
}: CarnetViewProps) {
  const t = useTranslations("play.carnet");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const total = splitMinutes(stats.totalMinutes);
  const focusTempo = focusSong ? songTempoProgress(focusSong, focusBestBpm) : null;
  const focusPercent = focusTempo ? focusTempo.percent : focusSong?.progress_percent ?? 0;

  return (
    /*
      Quatre blocs places explicitement : sur mobile ils s'empilent dans
      l'ordre de lecture (chiffres, reprendre, journal, semaine) — le
      bouton principal reste au-dessus de la ligne de flottaison. Sur ordi,
      ce qu'on a fait a gauche, ce qu'on va faire a droite.
    */
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <Stat label={t("sessions")} value={<>{stats.totalSessions}</>} />
          <Stat
            label={t("total")}
            value={
              <>
                {total.hours}
                <small className="text-[0.55em] text-muted-foreground">{t("hourShort")}</small>
                {total.minutes.toString().padStart(2, "0")}
              </>
            }
          />
          <Stat
            label={t("streak", { record: stats.longestStreak })}
            value={
              <>
                {stats.currentStreak}
                <small className="text-[0.55em] text-muted-foreground">{t("dayShort")}</small>
              </>
            }
          />
          <Stat
            className="hidden sm:block"
            label={t("thisWeek")}
            value={
              <>
                {stats.minutesThisWeek}
                <small className="text-[0.55em] text-muted-foreground"> {t("min")}</small>
              </>
            }
          />
        </dl>

        <PracticeCalendar data={calendar} />
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
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
                    {t("inProgress")}
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
              {isPracticing ? t("sessionRunning") : t("startSession")}
            </button>
          </section>
        )}

        <button
          type="button"
          onClick={onAddPastSession}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <History className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {t("addPastSession")}
        </button>
      </div>


      {recentSessions.length > 0 && (
        <section aria-labelledby="recent-sessions" className="min-w-0 lg:col-start-1 lg:row-start-2">
          <h2
            id="recent-sessions"
            className="flex justify-between border-b border-border pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            <span>{t("recentSessions")}</span>
            <span aria-hidden="true">{t("duration")}</span>
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
                    {session.song?.title ?? sessionExercisesLabel(session) ?? t("freeSession")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatWhen(session.practiced_at, tc, intlLocale)}
                    {session.bpm_achieved ? ` · ${session.bpm_achieved} ${t("bpm")}` : ""}
                  </p>
                </div>
                <span className="tabular font-display text-lg font-bold leading-none">
                  {session.duration_minutes}
                  <small className="text-xs font-semibold text-muted-foreground"> {t("min")}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {weeklyPlan && (
        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <WeeklyPlanCard plan={weeklyPlan} onWorkOnSong={onWorkOnSong} />
        </div>
      )}

      {/* Routines + reprise de la derniere session montee */}
      {(routines.length > 0 || lastSessionCount > 0) && (
        <section className="min-w-0 lg:col-span-2 lg:row-start-3">
          <h2 className="border-b border-border pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("routines")}
          </h2>

          {lastSessionCount > 0 && (
            <button
              type="button"
              onClick={onResumeSession}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <RotateCcw className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {t("resumeLast")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("pending", { count: lastSessionCount })}
                </span>
              </span>
            </button>
          )}

          {routines.length > 0 ? (
            <ul className="mt-3">
              {routines.map((routine) => (
                <li
                  key={routine.id}
                  className="flex items-center gap-2 border-b border-border py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onPlayRoutine(routine)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                      <Play className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {routine.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t("routineCounts", { songs: routine.song_count, exercises: routine.exercise_count })}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRoutine(routine.id)}
                    aria-label={t("deleteRoutine", { name: routine.name })}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("noRoutine")}
            </p>
          )}
        </section>
      )}
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
