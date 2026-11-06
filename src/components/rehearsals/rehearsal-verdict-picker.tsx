"use client";

import { useTranslations } from "next-intl";
import { REHEARSAL_VERDICTS, VERDICT_TEXT_CLASS } from "@/lib/rehearsal-log";
import type { RehearsalVerdict } from "@/types";

interface RehearsalVerdictPickerProps {
  label: string;
  value: RehearsalVerdict | null;
  onChange: (verdict: RehearsalVerdict | null) => void;
}

/** Ou en est le morceau apres cette repete. Rejouer sur le choix l'enleve : il reste facultatif. */
export function RehearsalVerdictPicker({ label, value, onChange }: RehearsalVerdictPickerProps) {
  const t = useTranslations("rehearsals.verdict");

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1">
      {REHEARSAL_VERDICTS.map((verdict) => {
        const active = value === verdict;
        return (
          <button
            key={verdict}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : verdict)}
            className={`min-h-[36px] rounded-lg border px-1 text-xs font-semibold transition-colors ${
              active
                ? `border-foreground bg-secondary ${VERDICT_TEXT_CLASS[verdict]}`
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {t(verdict)}
          </button>
        );
      })}
    </div>
  );
}
