"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { CreateSetlistModal } from "@/components/setlists/create-setlist-modal";
import { useIntlLocale } from "@/i18n/intl-locale";
import { formatConcertDate, isUpcomingConcert, shortTime } from "@/lib/concerts";
import type { BandConcert } from "@/types";

const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";
/** Combien de concerts passes avant « Voir les anciens ». */
const PAST_PREVIEW = 3;

interface BandConcertsSectionProps {
  bandId: string;
  concerts: BandConcert[];
  readOnly: boolean;
}

/** L'agenda du groupe : les concerts a venir, puis les derniers passes. */
export function BandConcertsSection({ bandId, concerts, readOnly }: BandConcertsSectionProps) {
  const t = useTranslations("concerts");
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  const upcoming = concerts.filter((concert) => isUpcomingConcert(concert.concert_date));
  const past = concerts.filter((concert) => !isUpcomingConcert(concert.concert_date)).reverse();
  const shownPast = showAllPast ? past : past.slice(0, PAST_PREVIEW);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 className={SECTION_TITLE}>
          {t("title")}
          {upcoming.length > 0 && <span className="tabular"> · {upcoming.length}</span>}
        </h2>
        {!readOnly && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <Icon name="add" className="h-3.5 w-3.5" strokeWidth={2} />
            {t("add")}
          </button>
        )}
      </div>

      {upcoming.length > 0 ? (
        <ul>
          {upcoming.map((concert) => (
            <ConcertRow key={concert.id} concert={concert} upcoming />
          ))}
        </ul>
      ) : (
        <p className="py-5 text-sm text-muted-foreground">{t("noUpcoming")}</p>
      )}

      {past.length > 0 && (
        <>
          <h3 className="mt-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("past")}
          </h3>
          <ul>
            {shownPast.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} upcoming={false} />
            ))}
          </ul>
          {past.length > PAST_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllPast((value) => !value)}
              className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold hover:underline"
            >
              {showAllPast ? t("showLess") : t("showAllPast", { count: past.length })}
            </button>
          )}
        </>
      )}

      <CreateSetlistModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        onSuccess={() => router.refresh()}
        bands={[]}
        presetBandId={bandId}
        concert
      />
    </section>
  );
}

function ConcertRow({ concert, upcoming }: { concert: BandConcert; upcoming: boolean }) {
  const t = useTranslations("concerts");
  const locale = useIntlLocale();
  const [y, m, d] = concert.concert_date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const month = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }).format(day).replace(".", "");
  const details = [
    formatConcertDate(concert.concert_date, locale, "short"),
    shortTime(concert.concert_time),
    [concert.venue, concert.city].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 border-b border-border py-2.5">
      <Link href={`/setlists/${concert.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
        <span
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border ${
            upcoming ? "border-foreground" : "border-border text-muted-foreground"
          }`}
          aria-hidden="true"
        >
          <span className="font-display text-lg font-extrabold leading-none tabular">{d}</span>
          <span className="text-[10px] font-semibold uppercase leading-tight">{month}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{concert.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
        </span>
      </Link>
      {upcoming && (
        <span className="flex shrink-0 items-center gap-1">
          {concert.ticket_url && (
            <a
              href={concert.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("ticketsFor", { name: concert.name })}
              title={t("tickets")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon name="open_in_new" className="h-4 w-4" />
            </a>
          )}
          <a
            href={`/api/setlists/${concert.id}/ics`}
            aria-label={t("addToCalendarFor", { name: concert.name })}
            title={t("addToCalendar")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon name="calendar_add_on" className="h-4 w-4" />
          </a>
        </span>
      )}
    </li>
  );
}
