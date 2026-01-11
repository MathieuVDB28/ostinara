"use client";

import { useEffect } from "react";
import type { useMetronome } from "@/lib/hooks/use-metronome";
import { TIME_SIGNATURES, type TimeSignature } from "@/types";

interface JamMetronomeProps {
  metronome: ReturnType<typeof useMetronome>;
  isHost: boolean;
  onSync: () => void;
}

export function JamMetronome({ metronome, isHost, onSync }: JamMetronomeProps) {
  const {
    isPlaying,
    currentBeat,
    bpm,
    timeSignature,
    setBpm,
    incrementBpm,
    setTimeSignature,
    toggle,
    tap,
    tapBpm,
  } = metronome;

  // Sync when host changes settings
  useEffect(() => {
    if (isHost) {
      onSync();
    }
  }, [isHost, bpm, timeSignature.beats, timeSignature.noteValue, isPlaying, onSync]);

  const formatTimeSignature = (ts: TimeSignature) => `${ts.beats}/${ts.noteValue}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Metronome</h3>
        {!isHost && (
          <span className="text-xs text-muted-foreground">
            Synchronise avec le host
          </span>
        )}
      </div>

      {/* Beat visualization */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: timeSignature.beats }, (_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-all ${
              isPlaying && currentBeat === i + 1
                ? i === 0
                  ? "bg-primary scale-125"
                  : "bg-primary/70 scale-110"
                : "bg-accent"
            }`}
          />
        ))}
      </div>

      {/* BPM Display */}
      <div className="text-center mb-4">
        <div className="text-5xl font-bold tabular-nums">{bpm}</div>
        <div className="text-sm text-muted-foreground">BPM</div>
      </div>

      {/* Controls - Host only */}
      {isHost ? (
        <>
          {/* BPM adjustment */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => incrementBpm(-5)}
              className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              -5
            </button>
            <button
              onClick={() => incrementBpm(-1)}
              className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              -1
            </button>

            {/* Slider */}
            <input
              type="range"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-32 accent-primary"
            />

            <button
              onClick={() => incrementBpm(1)}
              className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              +1
            </button>
            <button
              onClick={() => incrementBpm(5)}
              className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              +5
            </button>
          </div>

          {/* Time signature */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Signature :</span>
            <select
              value={`${timeSignature.beats}/${timeSignature.noteValue}`}
              onChange={(e) => {
                const [beats, noteValue] = e.target.value.split("/").map(Number);
                setTimeSignature({ beats, noteValue });
              }}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              {TIME_SIGNATURES.map((ts) => (
                <option key={formatTimeSignature(ts)} value={formatTimeSignature(ts)}>
                  {formatTimeSignature(ts)}
                </option>
              ))}
            </select>
          </div>

          {/* Tap tempo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={tap}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Tap Tempo {tapBpm ? `(${tapBpm})` : ""}
            </button>
          </div>

          {/* Play/Stop */}
          <div className="flex justify-center">
            <button
              onClick={toggle}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                isPlaying
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isPlaying ? (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </>
      ) : (
        /* Non-host view */
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            Signature : {formatTimeSignature(timeSignature)}
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
              isPlaying
                ? "bg-green-500/20 text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isPlaying ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                En cours
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                En pause
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
