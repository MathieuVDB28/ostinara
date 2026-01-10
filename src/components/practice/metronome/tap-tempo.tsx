"use client";

interface TapTempoProps {
  onTap: () => void;
  tapBpm: number | null;
  onReset?: () => void;
}

export function TapTempo({ onTap, tapBpm, onReset }: TapTempoProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onTap}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-all hover:bg-accent active:scale-95"
      >
        <svg
          className="h-5 w-5"
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
        {tapBpm !== null && (
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
            {tapBpm}
          </span>
        )}
      </button>

      {tapBpm !== null && onReset && (
        <button
          onClick={onReset}
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
  );
}
