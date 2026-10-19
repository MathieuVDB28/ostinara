"use client";

import { ListMusic } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { CommonT } from "@/i18n/types";
import type { SetlistWithDetails } from "@/types";

interface SetlistCardProps {
  setlist: SetlistWithDetails;
  onClick: () => void;
}

export function formatSetDuration(seconds: number, t: CommonT): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return t("duration.hoursMinutesPadded", { h: hours, m: minutes.toString().padStart(2, "0") });
  }
  return t("duration.minutes", { m: minutes });
}

function formatDate(dateString: string, intlLocale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SetlistCard({ setlist, onClick }: SetlistCardProps) {
  const t = useTranslations("setlists.card");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const isUpcoming =
    setlist.concert_date && new Date(setlist.concert_date) > new Date();

  const meta = [
    t("songs", { count: setlist.song_count }),
    formatSetDuration(setlist.total_duration_seconds, tc),
    setlist.band?.name,
    setlist.venue,
  ].filter(Boolean);

  /*
   * Une ligne a filet (style Fanzine, docs/refonte-ui.md) : le nom en
   * condense, la date du concert a droite comme sur une affiche. La
   * barre ambree sur le flanc de la carte a disparu.
   */
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 border-b border-border py-3 text-left transition-colors hover:bg-accent/50"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-muted-foreground">
        <ListMusic className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-2xl font-extrabold uppercase leading-none">
          {setlist.name}
        </span>
        <span className="tabular mt-0.5 block truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
      </span>

      {setlist.concert_date && (
        <span
          className={`tabular shrink-0 text-right font-display text-sm font-bold uppercase leading-tight ${
            isUpcoming ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {isUpcoming && (
            <span className="block font-mono text-[9.5px] font-semibold tracking-[0.06em] text-success">{t("upcoming")}</span>
          )}
          {formatDate(setlist.concert_date, intlLocale)}
        </span>
      )}
    </button>
  );
}
