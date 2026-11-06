"use client";

import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { VERDICT_TEXT_CLASS } from "@/lib/rehearsal-log";
import type { SetlistReadiness } from "@/types";

/** Ou en est le set, d'apres le dernier verdict de chaque morceau en repete. */
export function SetlistReadinessPanel({ readiness }: { readiness: SetlistReadiness }) {
  const t = useTranslations("rehearsals.readiness");
  const tv = useTranslations("rehearsals.verdict");
  const intlLocale = useIntlLocale();

  if (readiness.total === 0) return null;

  const segments = [
    { key: "ready", count: readiness.ready, className: "bg-success" },
    { key: "solid", count: readiness.solid, className: "bg-foreground" },
    { key: "rework", count: readiness.rework, className: "bg-primary" },
  ];

  return (
    <section aria-labelledby="setlist-readiness">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2
          id="setlist-readiness"
          className="font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <span className="tabular text-sm font-semibold">
          {t("readyCount", { ready: readiness.ready, total: readiness.total })}
        </span>
      </div>

      <div
        role="img"
        aria-label={t("summary", {
          ready: readiness.ready,
          solid: readiness.solid,
          rework: readiness.rework,
          unplayed: readiness.unplayed,
        })}
        className="mt-3 flex h-2 gap-px overflow-hidden rounded-full bg-secondary"
      >
        {segments.map((segment) =>
          segment.count > 0 ? (
            <span
              key={segment.key}
              className={segment.className}
              style={{ width: `${(segment.count / readiness.total) * 100}%` }}
            />
          ) : null
        )}
      </div>

      <ul className="mt-2">
        {readiness.rows.map((row) => (
          <li key={row.item_id} className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <span className="min-w-0 truncate font-medium">
              {row.title}
              {row.artist && <span className="font-normal text-muted-foreground"> · {row.artist}</span>}
            </span>
            <span className="shrink-0 text-right text-xs">
              <span className={`font-semibold ${row.verdict ? VERDICT_TEXT_CLASS[row.verdict] : "text-muted-foreground"}`}>
                {row.verdict ? tv(row.verdict) : t("unplayed")}
              </span>
              {row.date && (
                <span className="block text-muted-foreground">
                  {new Date(row.date).toLocaleDateString(intlLocale, { day: "numeric", month: "short" })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
