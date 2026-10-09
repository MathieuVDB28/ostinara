"use client";

import { useState, useCallback } from "react";
import { Hand, X } from "lucide-react";

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
    <div className="flex items-center gap-1.5">
      <button
        aria-label="Taper le tempo"
        onClick={handleTap}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 font-mono text-xs font-semibold transition-all active:scale-95 ${
          isAnimating ? "scale-95 border-primary text-primary" : "border-border hover:bg-accent"
        }`}
      >
        <Hand className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        {tapBpm !== null ? `${tapBpm}` : tapCount > 0 ? `${tapCount}×` : "Tap"}
      </button>

      {tapBpm !== null && onReset && (
        <button
          onClick={handleReset}
          aria-label="Réinitialiser le tap tempo"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
