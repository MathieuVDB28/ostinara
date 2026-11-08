"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  BAND_RECORDING_KINDS,
  BAND_RECORDING_QUOTA_BYTES,
  formatBytes,
  type BandRecordingKind,
} from "@/lib/band-recordings";
import { AddRecordingModal } from "./add-recording-modal";
import { RecordingRow } from "./recording-row";
import type { BandRecordingListItem } from "@/types";

interface RecordingsListViewProps {
  bandId: string;
  bandName: string;
  recordings: BandRecordingListItem[];
  storageUsed: number;
  readOnly: boolean;
}

/** Tous les enregistrements du groupe, filtres par type, avec la jauge des 20 Go. */
export function RecordingsListView({ bandId, bandName, recordings, storageUsed, readOnly }: RecordingsListViewProps) {
  const t = useTranslations("recordings");
  const locale = useIntlLocale();
  const [kind, setKind] = useState<BandRecordingKind | "all">("all");
  const [adding, setAdding] = useState(false);

  const shown = useMemo(
    () => (kind === "all" ? recordings : recordings.filter((recording) => recording.kind === kind)),
    [kind, recordings]
  );
  const full = storageUsed >= BAND_RECORDING_QUOTA_BYTES;
  const percent = Math.min(100, Math.round((storageUsed / BAND_RECORDING_QUOTA_BYTES) * 100));
  const kindsPresent = BAND_RECORDING_KINDS.filter((value) => recordings.some((recording) => recording.kind === value));

  const chip = (active: boolean) =>
    `min-h-[36px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${
      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
    }`;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href={`/commu/groupes/${bandId}`}
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          {bandName}
        </Link>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.88]">{t("title")}</h1>
          {!readOnly && !full && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent"
            >
              <Icon name="add" className="h-4 w-4" />
              {t("add")}
            </button>
          )}
        </div>
        {readOnly && <p className="mt-2 text-sm text-muted-foreground">{t("readOnly")}</p>}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("storageLabel")}</span>
          <span className="tabular text-muted-foreground">
            {t("storage", {
              used: formatBytes(storageUsed, locale),
              total: formatBytes(BAND_RECORDING_QUOTA_BYTES, locale),
            })}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("storageLabel")}
        >
          <div className={`h-full ${full ? "bg-destructive" : "bg-primary"}`} style={{ width: `${percent}%` }} />
        </div>
        {full && !readOnly && <p className="mt-2 text-sm text-muted-foreground">{t("storageFull")}</p>}
      </div>

      {kindsPresent.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>
            {t("filterAll")}
          </button>
          {kindsPresent.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={chip(kind === value)}>
              {t(`kinds.${value}`)}
            </button>
          ))}
        </div>
      )}

      {recordings.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t("emptyFiltered")}</p>
      ) : (
        <ul className="border-t border-border">
          {shown.map((recording) => (
            <RecordingRow key={recording.id} recording={recording} />
          ))}
        </ul>
      )}

      {adding && <AddRecordingModal bandId={bandId} onClose={() => setAdding(false)} />}
    </div>
  );
}
