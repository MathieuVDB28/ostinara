"use client";

import { instrumentLabel, instrumentMeta } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { Instrument, ProfileInstrument } from "@/types";

interface Props {
  options: Pick<ProfileInstrument, "instrument" | "custom_label">[];
  value: Instrument | null;
  onChange: (instrument: Instrument) => void;
  /** Le nom du groupe pour les lecteurs d'ecran. */
  label: string;
  /** Une puce « Tous » en tete, qui renvoie null. */
  allLabel?: string;
  onAll?: () => void;
  className?: string;
}

/**
 * Le choix d'un instrument parmi les siens, en puces. Les ecrans ne le
 * montrent qu'aux musiciens qui en jouent plusieurs.
 */
export function InstrumentSwitch({ options, value, onChange, label, allLabel, onAll, className = "" }: Props) {
  const chip = (active: boolean) =>
    `inline-flex min-h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
      {allLabel && onAll && (
        <button type="button" role="radio" aria-checked={value === null} onClick={onAll} className={chip(value === null)}>
          {allLabel}
        </button>
      )}
      {options.map((option) => (
        <button
          key={option.instrument}
          type="button"
          role="radio"
          aria-checked={value === option.instrument}
          onClick={() => onChange(option.instrument)}
          className={chip(value === option.instrument)}
        >
          <Icon name={instrumentMeta(option.instrument).icon} className="h-3.5 w-3.5" />
          {instrumentLabel(option)}
        </button>
      ))}
    </div>
  );
}
