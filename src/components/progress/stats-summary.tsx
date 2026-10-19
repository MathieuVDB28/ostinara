"use client";

import { useTranslations } from "next-intl";
import type { CommonT } from "@/i18n/types";
import type { PracticeStats } from "@/types";

interface StatsSummaryProps {
  stats: PracticeStats;
}

export function formatDuration(minutes: number, t: CommonT): string {
  if (minutes < 60) return t("duration.minutes", { m: minutes });
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? t("duration.hoursMinutes", { h: hours, m: mins }) : t("duration.hours", { h: hours });
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
  const t = useTranslations("progress.stats");
  const tc = useTranslations("common");
  const items = [
    {
      label: t("sessions"),
      value: String(stats.totalSessions),
      hint: null,
    },
    {
      label: t("totalTime"),
      value: formatDuration(stats.totalMinutes, tc),
      hint: null,
    },
    {
      label: t("streak"),
      value: tc("duration.days", { d: stats.currentStreak }),
      hint:
        stats.longestStreak > stats.currentStreak
          ? t("record", { d: stats.longestStreak })
          : null,
    },
    {
      label: t("thisWeek"),
      value: formatDuration(stats.minutesThisWeek, tc),
      hint: t("sessionsCount", { count: stats.sessionsThisWeek }),
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
