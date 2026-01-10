"use client";

import { useState, useCallback } from "react";

interface TapTempoProps {
  onTap: () => void;
  tapBpm: number | null;
  onReset?: () => void;
}

export function TapTempo({ onTap, tapBpm, onReset }: TapTempoProps) {
  const [tapCount, setTapCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTap = useCallback(() => {
    // Animation feedback
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 100);

    // Increment tap count
    setTapCount((prev) => prev + 1);

    // Reset tap count after 2 seconds of inactivity
    setTimeout(() => {
      setTapCount(0);
    }, 2000);

    onTap();
  }, [onTap]);

  const handleReset = useCallback(() => {
    setTapCount(0);
    onReset?.();
  }, [onReset]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleTap}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
            isAnimating
              ? "border-primary bg-primary/20 scale-95"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isAnimating ? "scale-125" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
          <span>TAP TEMPO</span>
          {tapCount > 0 && tapBpm === null && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
              {tapCount} tap{tapCount > 1 ? "s" : ""}
            </span>
          )}
          {tapBpm !== null && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              {tapBpm} BPM
            </span>
          )}
        </button>

        {tapBpm !== null && onReset && (
          <button
            onClick={handleReset}
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent"
            title="Réinitialiser"
          >
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Instructions */}
      {tapCount === 0 && tapBpm === null && (
        <p className="text-center text-xs text-muted-foreground">
          Tapez le rythme souhaité (min. 2 taps)
        </p>
      )}
    </div>
  );
}
