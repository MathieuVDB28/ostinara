"use client";

import { useTranslations } from "next-intl";
import { MoodSelector } from "@/components/progress/mood-selector";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { instrumentLabel } from "@/lib/instruments";
import type { Instrument, SessionMood } from "@/types";

export const REHEARSAL_FIELD_LABEL =
  "mb-1.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

interface RehearsalCarnetFieldsProps {
  poste: { instrument?: Instrument | null; instrument_label?: string | null } | null;
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  mood: SessionMood | null;
  onMoodChange: (mood: SessionMood | null) => void;
  share: boolean;
  onShareChange: (share: boolean) => void;
}

/** L'instrument tenu : le poste du groupe d'abord, sinon l'instrument principal. */
export function initialRehearsalInstrument(
  poste: RehearsalCarnetFieldsProps["poste"],
  primary: Instrument | null
): Instrument {
  return poste?.instrument ?? primary ?? "guitar";
}

/**
 * Ce qui n'appartient qu'au musicien dans une repete : ce qu'il y a joue, comment
 * ca s'est passe pour lui, et ce que ses amis en voient.
 */
export function RehearsalCarnetFields({
  poste,
  instrument,
  onInstrumentChange,
  mood,
  onMoodChange,
  share,
  onShareChange,
}: RehearsalCarnetFieldsProps) {
  const t = useTranslations("rehearsals.carnet");
  const te = useTranslations("enums");
  const myInstruments = useMyInstruments();

  // Mes instruments, plus le poste du groupe s'il n'en fait pas partie.
  const options = myInstruments.instruments.map((entry) => ({
    value: entry.instrument,
    label: instrumentLabel(entry, te),
  }));
  if (poste?.instrument && !options.some((option) => option.value === poste.instrument)) {
    options.push({
      value: poste.instrument,
      label: instrumentLabel({ instrument: poste.instrument, custom_label: poste.instrument_label }, te),
    });
  }

  return (
    <div className="space-y-4">
      {options.length > 1 && (
        <div>
          <label htmlFor="rehearsal-instrument" className={REHEARSAL_FIELD_LABEL}>
            {t("instrument")}
          </label>
          <select
            id="rehearsal-instrument"
            value={instrument}
            onChange={(event) => onInstrumentChange(event.target.value as Instrument)}
            className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className={REHEARSAL_FIELD_LABEL}>{t("mood")}</span>
        <MoodSelector value={mood} onChange={onMoodChange} size="sm" />
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => onShareChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
        />
        <span>
          <span className="font-semibold">{t("share")}</span>
          <span className="block text-xs text-muted-foreground">{t("shareHint")}</span>
        </span>
      </label>
    </div>
  );
}
