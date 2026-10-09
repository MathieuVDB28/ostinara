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
    // Style Atelier (docs/refonte-ui.md) : les chiffres en condense, des
    // libelles en mono, une ligne a filets plutot qu'une carte.
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <dt className="order-2 mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="tabular order-1 font-display text-[30px] font-bold leading-none">
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
