"use client";

import type { PracticeStats } from "@/types";

interface StatsSummaryProps {
  stats: PracticeStats;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} h ${mins}` : `${hours} h`;
}

/**
 * Bandeau de stats, pas quatre cartes.
 *
 * Les cartes bordees portaient une ombre violette codee en dur
 * (rgba(139, 92, 246, .08)) et une icone text-primary, restes d'une
 * palette anterieure : deux teintes qui n'existent nulle part ailleurs
 * dans le theme ambre, et qui ne changent pas entre clair et sombre.
 * Elles pesaient aussi ~210 px avant la premiere session. Ici : un
 * bandeau de chiffres, ~120 px, et rien qui rivalise visuellement avec
 * les cartes de session en dessous.
 */
export function StatsSummary({ stats }: StatsSummaryProps) {
  const items = [
    {
      label: "Sessions",
      value: String(stats.totalSessions),
      hint: null,
    },
    {
      label: "Temps total",
      value: formatDuration(stats.totalMinutes),
      hint: null,
    },
    {
      label: "Série",
      value: `${stats.currentStreak} j`,
      hint:
        stats.longestStreak > stats.currentStreak
          ? `record ${stats.longestStreak} j`
          : null,
    },
    {
      label: "Cette semaine",
      value: formatDuration(stats.minutesThisWeek),
      hint: `${stats.sessionsThisWeek} session${
        stats.sessionsThisWeek > 1 ? "s" : ""
      }`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-border bg-card px-4 py-3.5 sm:grid-cols-4 sm:divide-x sm:divide-border sm:gap-x-0">
      {items.map((item, index) => (
        <div key={item.label} className={index > 0 ? "sm:pl-4" : ""}>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="tabular mt-0.5 text-xl font-extrabold leading-tight">
            {item.value}
          </dd>
          {item.hint && (
            <p className="tabular text-[11px] text-muted-foreground">
              {item.hint}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}

export function StatsSummaryCompact({ stats }: StatsSummaryProps) {
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
