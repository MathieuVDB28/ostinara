"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { bandRecordingsHref } from "@/lib/band-recordings";
import { AddRecordingModal, type RecordingDefaults } from "./add-recording-modal";
import { RecordingRow } from "./recording-row";
import type { BandRecordingListItem } from "@/types";

const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

interface BandRecordingsSectionProps {
  bandId: string;
  recordings: BandRecordingListItem[];
  readOnly: boolean;
  /** Combien en montrer avant « Tout voir ». */
  preview?: number;
  /** Fiche du repertoire ou repete : l'ajout s'y relie d'office. */
  defaults?: RecordingDefaults;
  /** Sur la page du groupe, « Tout voir » mene a la liste complete. */
  showSeeAll?: boolean;
}

/** Les enregistrements sur la page du groupe, d'une fiche ou d'une repete. */
export function BandRecordingsSection({
  bandId,
  recordings,
  readOnly,
  preview = 3,
  defaults,
  showSeeAll = true,
}: BandRecordingsSectionProps) {
  const t = useTranslations("recordings");
  const [adding, setAdding] = useState(false);
  const shown = recordings.slice(0, preview);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 className={SECTION_TITLE}>
          {t("title")}
          {recordings.length > 0 && <span className="tabular"> · {recordings.length}</span>}
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

      {shown.length > 0 ? (
        <ul>
          {shown.map((recording) => (
            <RecordingRow key={recording.id} recording={recording} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {showSeeAll && recordings.length > preview && (
        <Link
          href={bandRecordingsHref(bandId)}
          className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold hover:underline"
        >
          {t("seeAll", { count: recordings.length })}
          <Icon name="chevron_right" className="h-4 w-4" />
        </Link>
      )}

      {adding && <AddRecordingModal bandId={bandId} defaults={defaults} onClose={() => setAdding(false)} />}
    </section>
  );
}
