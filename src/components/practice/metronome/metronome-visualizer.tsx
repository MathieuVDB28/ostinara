"use client";

import type { TimeSignature } from "@/types";

interface MetronomeVisualizerProps {
  timeSignature: TimeSignature;
  currentBeat: number;
  accentPattern: number[];
  silentMode: boolean;
  silentBeats: number[];
  isPlaying: boolean;
  onToggleAccent?: (beatIndex: number) => void;
  onToggleSilent?: (beatIndex: number) => void;
}

export function MetronomeVisualizer({
  timeSignature,
  currentBeat,
  accentPattern,
  silentMode,
  silentBeats,
  isPlaying,
  onToggleAccent,
  onToggleSilent,
}: MetronomeVisualizerProps) {
  const beats = Array.from({ length: timeSignature.beats }, (_, i) => i);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-3">
        {beats.map((beatIndex) => {
          const isCurrentBeat = isPlaying && currentBeat === beatIndex + 1;
          const isAccent = accentPattern[beatIndex] === 1;
          const isSilent = silentMode && silentBeats.includes(beatIndex);

          return (
            <button
              key={beatIndex}
              onClick={() => {
                if (silentMode) {
                  onToggleSilent?.(beatIndex);
                } else {
                  onToggleAccent?.(beatIndex);
                }
              }}
              aria-label={`Temps ${beatIndex + 1}${isAccent ? ", accentué" : ""}${isSilent ? ", silencieux" : ""}`}
              aria-pressed={silentMode ? isSilent : isAccent}
              className="flex h-9 w-9 items-center justify-center rounded-full"
            >
              {/*
                Un point par temps. L'accent se lit a l'anneau, le temps
                joue au point plein : la forme porte l'information, pas
                seulement la teinte.
              */}
              <span
                aria-hidden="true"
                className={`block h-4 w-4 rounded-full transition-transform duration-75 ${
                  isCurrentBeat ? "scale-125 bg-primary" : "bg-muted"
                } ${isAccent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${
                  isSilent ? "opacity-25" : ""
                }`}
              />
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        {timeSignature.beats}/{timeSignature.noteValue} ·{" "}
        {silentMode ? "touche un temps pour le rendre muet" : "touche un temps pour l'accentuer"}
      </p>
    </div>
  );
}
