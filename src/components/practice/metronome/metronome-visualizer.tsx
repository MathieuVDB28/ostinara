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
    <div className="flex flex-col gap-3">
      {/* Indicateur de signature */}
      <div className="text-center text-sm text-muted-foreground">
        {timeSignature.beats}/{timeSignature.noteValue}
      </div>

      {/* Beats */}
      <div className="flex flex-wrap justify-center gap-2">
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
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                isCurrentBeat
                  ? isAccent
                    ? "scale-110 border-primary bg-primary text-primary-foreground"
                    : "scale-105 border-primary/70 bg-primary/70 text-primary-foreground"
                  : isAccent
                    ? "border-primary bg-primary/20"
                    : "border-border bg-card"
              } ${isSilent ? "opacity-30" : ""}`}
            >
              {/* Numéro du beat */}
              <span
                className={`text-sm font-medium ${
                  isCurrentBeat ? "text-primary-foreground" : ""
                }`}
              >
                {beatIndex + 1}
              </span>

              {/* Indicateur d'accent */}
              {isAccent && !isCurrentBeat && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}

              {/* Indicateur silencieux */}
              {isSilent && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <p className="text-center text-xs text-muted-foreground">
        {silentMode
          ? "Cliquez pour rendre un beat silencieux"
          : "Cliquez pour ajouter/retirer un accent"}
      </p>
    </div>
  );
}
