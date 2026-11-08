"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useIntlLocale } from "@/i18n/intl-locale";
import { bandRecordingHref, formatRecordingTime } from "@/lib/band-recordings";
import type { BandRecordingListItem } from "@/types";

/** Une ligne de liste : type, titre, auteur, duree, date, commentaires. */
export function RecordingRow({ recording }: { recording: BandRecordingListItem }) {
  const t = useTranslations("recordings");
  const locale = useIntlLocale();
  const author = recording.author?.display_name || recording.author?.username || t("someone");
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(recording.created_at));
  const details = [
    t("by", { name: author }),
    recording.duration_seconds !== null ? formatRecordingTime(recording.duration_seconds) : null,
    date,
    recording.comment_count > 0 ? t("comments", { count: recording.comment_count }) : null,
  ].filter(Boolean);

  return (
    <li className="border-b border-border">
      <Link
        href={bandRecordingHref(recording.band_id, recording.id)}
        className="flex min-h-[60px] items-center gap-3 py-2.5 transition-colors hover:bg-accent/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon
            name={recording.media_type === "video" ? "videocam" : "audiotrack"}
            className="h-5 w-5"
            aria-label={t(recording.media_type)}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{recording.title}</span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {t(`kinds.${recording.kind}`)}
            </span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
        </span>
        <Icon name="chevron_right" className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
