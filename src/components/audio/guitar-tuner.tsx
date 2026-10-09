"use client";

import { useState } from "react";
import { ChevronDown, Mic } from "lucide-react";
import { usePitchDetection } from "@/lib/hooks/use-pitch-detection";
import { TUNING_GROUPS, pitchToFrequency } from "@/lib/tunings";
import { TunerGauge } from "./tuner-gauge";
import type { TuningPreset } from "@/types";

const TUNING_PRESETS: TuningPreset[] = TUNING_GROUPS.flatMap((group) =>
  group.tunings.map((t) => ({
    name: t.value,
    notes: t.pitches,
    frequencies: t.pitches.map(pitchToFrequency),
  }))
);

function getClosestString(
  frequency: number,
  preset: TuningPreset
): { index: number; note: string; targetFreq: number; cents: number } | null {
  let closestIndex = 0;
  let minCentsDiff = Infinity;

  for (let i = 0; i < preset.frequencies.length; i++) {
    const cents = 1200 * Math.log2(frequency / preset.frequencies[i]);
    if (Math.abs(cents) < Math.abs(minCentsDiff)) {
      minCentsDiff = cents;
      closestIndex = i;
    }
  }

  return {
    index: closestIndex,
    note: preset.notes[closestIndex],
    targetFreq: preset.frequencies[closestIndex],
    cents: Math.round(minCentsDiff),
  };
}

export function GuitarTuner() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const { result, isActive, error, start, stop } = usePitchDetection();

  const preset = TUNING_PRESETS[selectedPreset];
  const closestString = result ? getClosestString(result.frequency, preset) : null;

  const absCents = closestString ? Math.abs(closestString.cents) : 50;
  let statusColor = "text-muted-foreground";
  let statusText = "En attente...";

  if (closestString) {
    if (absCents <= 5) {
      statusColor = "text-success";
      statusText = "Accordé !";
    } else if (absCents <= 15) {
      statusColor = "text-primary";
      statusText = closestString.cents < 0 ? "Un peu bas" : "Un peu haut";
    } else {
      statusColor = "text-destructive";
      statusText = closestString.cents < 0 ? "Trop bas" : "Trop haut";
    }
  }

  // Les cordes de la grave a l'aigue, numerotees comme on les nomme : 6e a 1re.
  const strings = preset.notes.map((note, i) => ({
    note,
    number: preset.notes.length - i,
    isHighlighted: closestString?.index === i,
  }));

  /*
   * Style Atelier (docs/refonte-ui.md) : la note jouee en tres grand, le
   * cadran a graduations, les six cordes en grille. L'ambre n'apparait que
   * sur le bouton qui active le micro.
   */
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <label className="relative">
        <span className="sr-only">Accordage</span>
        <select
          value={preset.name}
          onChange={(e) =>
            setSelectedPreset(TUNING_PRESETS.findIndex((p) => p.name === e.target.value))
          }
          className="h-9 appearance-none rounded-full border border-border bg-card pl-4 pr-9 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
        >
          {TUNING_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.tunings.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.notes})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
      </label>

      {isActive ? (
        <>
          <TunerGauge cents={closestString?.cents ?? 0} />

          <div className="text-center" aria-live="polite">
            <p
              className={`font-display text-[96px] font-extrabold leading-[0.85] ${
                result ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {result ? (
                <>
                  {result.note}
                  <sub className="align-baseline text-[28px] text-muted-foreground">{result.octave}</sub>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className={`mt-2 text-sm font-semibold ${statusColor}`}>
              {statusText}
              {result && <span className="tabular font-mono text-xs text-muted-foreground"> · {result.frequency} Hz</span>}
            </p>
          </div>
        </>
      ) : (
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Joue une corde à vide : l&apos;accordeur reconnaît la note et t&apos;indique si tu es juste.
        </p>
      )}

      <div className="grid w-full grid-cols-6 gap-1.5">
        {strings.map((string) => (
          <div
            key={`${preset.name}-${string.number}`}
            className={`flex h-14 flex-col items-center justify-center rounded-xl border transition-colors ${
              string.isHighlighted ? `border-primary shadow-[inset_0_0_0_1px_var(--primary)] ${statusColor}` : "border-border"
            }`}
          >
            <span className="font-display text-xl font-extrabold leading-none">{string.note}</span>
            <span className="font-mono text-[9.5px] text-muted-foreground">{string.number}e</span>
          </div>
        ))}
      </div>

      {isActive ? (
        <button
          onClick={stop}
          className="min-h-[40px] rounded-full border border-border px-6 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Arrêter
        </button>
      ) : (
        <button
          onClick={start}
          className="flex min-h-[46px] items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Mic className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Activer l&apos;accordeur
        </button>
      )}

      {error && <p className="max-w-sm text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
