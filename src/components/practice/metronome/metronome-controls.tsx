"use client";

import { useState } from "react";
import { TIME_SIGNATURES, SUBDIVISION_LABELS } from "@/types";
import type { TimeSignature, Subdivision } from "@/types";

interface MetronomeControlsProps {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  volume: number;
  silentMode: boolean;
  onBpmChange: (bpm: number) => void;
  onBpmIncrement: (delta: number) => void;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  onSubdivisionChange: (sub: Subdivision) => void;
  onVolumeChange: (vol: number) => void;
  onSilentModeChange: (enabled: boolean) => void;
}

export function MetronomeControls({
  bpm,
  timeSignature,
  subdivision,
  volume,
  silentMode,
  onBpmChange,
  onBpmIncrement,
  onTimeSignatureChange,
  onSubdivisionChange,
  onVolumeChange,
  onSilentModeChange,
}: MetronomeControlsProps) {
  const [showTimeSignatures, setShowTimeSignatures] = useState(false);
  const [showSubdivisions, setShowSubdivisions] = useState(false);

  const subdivisions: Subdivision[] = ["none", "eighth", "triplet", "sixteenth"];

  return (
    <div className="space-y-4">
      {/* BPM Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          {/* Boutons -5 et -1 */}
          <button
            onClick={() => onBpmIncrement(-5)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-accent"
          >
            -5
          </button>
          <button
            onClick={() => onBpmIncrement(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-accent"
          >
            -1
          </button>

          {/* Affichage BPM */}
          <div className="flex min-w-[100px] flex-col items-center px-2">
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
              min={20}
              max={300}
              className="w-20 bg-transparent text-center text-3xl font-bold focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">BPM</span>
          </div>

          {/* Boutons +1 et +5 */}
          <button
            onClick={() => onBpmIncrement(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-accent"
          >
            +1
          </button>
          <button
            onClick={() => onBpmIncrement(5)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-accent"
          >
            +5
          </button>
        </div>

        {/* Slider BPM */}
        <input
          type="range"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Signature temporelle et Subdivisions */}
      <div className="flex gap-2">
        {/* Time Signature Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setShowTimeSignatures(!showTimeSignatures);
              setShowSubdivisions(false);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <span>
              {timeSignature.beats}/{timeSignature.noteValue}
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${showTimeSignatures ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showTimeSignatures && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
              {TIME_SIGNATURES.map((ts) => (
                <button
                  key={`${ts.beats}/${ts.noteValue}`}
                  onClick={() => {
                    onTimeSignatureChange(ts);
                    setShowTimeSignatures(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                    ts.beats === timeSignature.beats &&
                    ts.noteValue === timeSignature.noteValue
                      ? "bg-primary/20 text-primary"
                      : ""
                  }`}
                >
                  {ts.beats}/{ts.noteValue}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subdivisions Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setShowSubdivisions(!showSubdivisions);
              setShowTimeSignatures(false);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <span>{SUBDIVISION_LABELS[subdivision]}</span>
            <svg
              className={`h-4 w-4 transition-transform ${showSubdivisions ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showSubdivisions && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
              {subdivisions.map((sub) => (
                <button
                  key={sub}
                  onClick={() => {
                    onSubdivisionChange(sub);
                    setShowSubdivisions(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                    sub === subdivision ? "bg-primary/20 text-primary" : ""
                  }`}
                >
                  {SUBDIVISION_LABELS[sub]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3">
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
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
          className="flex-1 accent-primary"
        />
        <span className="w-10 text-right text-sm text-muted-foreground">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Silent Mode Toggle */}
      <button
        onClick={() => onSilentModeChange(!silentMode)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
          silentMode
            ? "border-primary bg-primary/20 text-primary"
            : "border-border bg-card hover:bg-accent"
        }`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {silentMode ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          )}
        </svg>
        <span>Mode silencieux {silentMode ? "activé" : ""}</span>
      </button>
    </div>
  );
}
