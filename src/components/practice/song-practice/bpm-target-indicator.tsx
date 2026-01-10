"use client";

import type { Song, SongPracticeStats } from "@/types";

interface BpmTargetIndicatorProps {
  song: Song;
  currentBpm: number;
  practiceStats?: SongPracticeStats;
  className?: string;
}

export function BpmTargetIndicator({
  song,
  currentBpm,
  practiceStats,
  className = "",
}: BpmTargetIndicatorProps) {
  const targetBpm = song.target_bpm;

  if (!targetBpm) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <div className="text-center text-sm text-muted-foreground">
          <p>Pas de BPM cible défini pour ce morceau</p>
          <p className="mt-1 text-xs">
            Définissez un BPM cible pour suivre votre progression
          </p>
        </div>
      </div>
    );
  }

  // Calculer la progression (en supposant un point de départ raisonnable)
  const startingBpm = Math.max(40, targetBpm - 60); // Estimation du BPM de départ
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentBpm - startingBpm) / (targetBpm - startingBpm)) * 100)
  );

  const isAtTarget = currentBpm >= targetBpm;
  const remainingBpm = Math.max(0, targetBpm - currentBpm);

  // Couleur du cercle basée sur la progression
  const getCircleColor = () => {
    if (isAtTarget) return "text-green-500";
    if (progressPercent >= 75) return "text-primary";
    if (progressPercent >= 50) return "text-blue-400";
    if (progressPercent >= 25) return "text-yellow-400";
    return "text-muted-foreground";
  };

  // SVG circle properties
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {song.cover_url ? (
            <img
              src={song.cover_url}
              alt={song.title}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
          )}
          <div>
            <div className="text-sm font-medium">{song.title}</div>
            <div className="text-xs text-muted-foreground">{song.artist}</div>
          </div>
        </div>

        {isAtTarget && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Objectif atteint!
          </span>
        )}
      </div>

      {/* Progress Circle */}
      <div className="flex items-center justify-center gap-8">
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-accent"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={`transition-all duration-500 ${getCircleColor()}`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{currentBpm}</span>
            <span className="text-xs text-muted-foreground">BPM</span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold text-muted-foreground">{targetBpm}</div>
            <div className="text-xs text-muted-foreground">BPM cible</div>
          </div>

          {!isAtTarget && (
            <div>
              <div className="text-lg font-semibold text-primary">-{remainingBpm}</div>
              <div className="text-xs text-muted-foreground">BPM restants</div>
            </div>
          )}

          <div>
            <div className="text-lg font-semibold">{Math.round(progressPercent)}%</div>
            <div className="text-xs text-muted-foreground">Progression</div>
          </div>
        </div>
      </div>

      {/* Practice stats */}
      {practiceStats && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {practiceStats.bestBpm || "-"}
            </div>
            <div className="text-xs text-muted-foreground">Meilleur BPM</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{practiceStats.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{practiceStats.totalMinutes}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
        </div>
      )}
    </div>
  );
}
