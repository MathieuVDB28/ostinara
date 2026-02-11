"use client";

interface ListeningAnimationProps {
  duration: number;
  maxDuration: number;
}

export function ListeningAnimation({ duration, maxDuration }: ListeningAnimationProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pulsing circles */}
      <div className="relative flex h-48 w-48 items-center justify-center">
        {/* Outer rings */}
        <div className="absolute h-full w-full rounded-full bg-primary/10 animate-listening-pulse" />
        <div
          className="absolute h-full w-full rounded-full bg-primary/10 animate-listening-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute h-full w-full rounded-full bg-primary/10 animate-listening-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute h-full w-full rounded-full bg-primary/10 animate-listening-pulse"
          style={{ animationDelay: "1.5s" }}
        />

        {/* Center mic icon */}
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm">
          <svg
            className="h-10 w-10 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 10v2a7 7 0 0 1-14 0v-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
            <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Progress info */}
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">Écoute en cours...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {duration}s / {maxDuration}s
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-linear"
            style={{ width: `${(duration / maxDuration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
