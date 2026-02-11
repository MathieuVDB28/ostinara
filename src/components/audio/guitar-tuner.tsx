"use client";

import { useState } from "react";
import { usePitchDetection } from "@/lib/hooks/use-pitch-detection";
import { TunerGauge } from "./tuner-gauge";
import type { TuningPreset } from "@/types";

const TUNING_PRESETS: TuningPreset[] = [
  {
    name: "Standard",
    notes: ["E2", "A2", "D3", "G3", "B3", "E4"],
    frequencies: [82.41, 110.0, 146.83, 196.0, 246.94, 329.63],
  },
  {
    name: "Drop D",
    notes: ["D2", "A2", "D3", "G3", "B3", "E4"],
    frequencies: [73.42, 110.0, 146.83, 196.0, 246.94, 329.63],
  },
  {
    name: "Half Step Down",
    notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"],
    frequencies: [77.78, 103.83, 138.59, 185.0, 233.08, 311.13],
  },
  {
    name: "Open G",
    notes: ["D2", "G2", "D3", "G3", "B3", "D4"],
    frequencies: [73.42, 98.0, 146.83, 196.0, 246.94, 293.66],
  },
  {
    name: "Open D",
    notes: ["D2", "A2", "D3", "F#3", "A3", "D4"],
    frequencies: [73.42, 110.0, 146.83, 185.0, 220.0, 293.66],
  },
  {
    name: "DADGAD",
    notes: ["D2", "A2", "D3", "G3", "A3", "D4"],
    frequencies: [73.42, 110.0, 146.83, 196.0, 220.0, 293.66],
  },
];

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
      statusColor = "text-green-400";
      statusText = "Accordé !";
    } else if (absCents <= 15) {
      statusColor = "text-yellow-400";
      statusText = closestString.cents < 0 ? "Un peu bas" : "Un peu haut";
    } else {
      statusColor = "text-red-400";
      statusText = closestString.cents < 0 ? "Trop bas" : "Trop haut";
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-6">
      {/* Tuning preset selector */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TUNING_PRESETS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setSelectedPreset(i)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              i === selectedPreset
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* String reference */}
      <div className="mb-6 flex gap-3">
        {preset.notes.map((note, i) => {
          const isHighlighted = closestString?.index === i;
          return (
            <div
              key={`${preset.name}-${i}`}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                isHighlighted
                  ? `border-primary bg-primary/20 ${statusColor}`
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {note}
            </div>
          );
        })}
      </div>

      {/* Main display */}
      {isActive ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          {/* Detected note */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${result ? statusColor : "text-muted-foreground"}`}>
              {result ? `${result.note}${result.octave}` : "—"}
            </div>
            {result && (
              <div className="mt-1 text-sm text-muted-foreground">
                {result.frequency} Hz
              </div>
            )}
          </div>

          {/* Gauge */}
          <TunerGauge cents={closestString?.cents ?? 0} />

          {/* Status */}
          <p className={`text-sm font-medium ${statusColor}`}>{statusText}</p>

          {/* Stop button */}
          <button
            onClick={stop}
            className="mt-4 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Arrêter
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Inactive tuner icon */}
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-16 w-16 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 12h4m12 0h4" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4" strokeLinecap="round" />
              <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" strokeLinecap="round" />
              <path d="M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83" strokeLinecap="round" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold">Accordeur guitare</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Joue une corde à vide. L'accordeur détectera la note et t'indiquera si tu es juste.
            </p>
          </div>

          <button
            onClick={start}
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
          >
            Activer l'accordeur
          </button>

          {error && (
            <p className="max-w-sm text-center text-sm text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
