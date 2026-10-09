"use client";

import { Check } from "lucide-react";
import { Frets } from "@/components/ui/frets";
import type { Song, SongPracticeStats } from "@/types";

interface BpmTargetIndicatorProps {
  song: Song;
  currentBpm: number;
  practiceStats?: SongPracticeStats;
  className?: string;
}

/**
 * Le tempo du metronome rapporte a la cible du morceau, style Atelier
 * (docs/refonte-ui.md) : deux nombres, douze frettes et l'historique en
 * une ligne. L'anneau de progression et sa carte ont disparu.
 */
export function BpmTargetIndicator({
  song,
  currentBpm,
  practiceStats,
  className = "",
}: BpmTargetIndicatorProps) {
  const targetBpm = song.target_bpm;

  if (!targetBpm) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Pas de tempo cible pour ce morceau. Fixe-le dans la liste ci-dessous (« + BPM cible ») pour suivre ta progression.
      </p>
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

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2 ${className}`}>
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tempo / cible
        </p>
        <p className="tabular font-display text-4xl font-bold leading-none">
          {currentBpm}
          <span className="text-xl text-muted-foreground">/{targetBpm}</span>
        </p>
      </div>
      <div className="grid justify-items-end gap-1.5">
        {isAtTarget ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-success">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Objectif atteint
          </span>
        ) : (
          <span className="tabular text-xs font-semibold text-muted-foreground">
            encore {remainingBpm} bpm
          </span>
        )}
        <Frets value={progressPercent} label={`${Math.round(progressPercent)} %`} />
      </div>

      {practiceStats && (
        <p className="tabular col-span-2 border-t border-border pt-2 text-xs text-muted-foreground">
          Meilleur {practiceStats.bestBpm || "—"} bpm · {practiceStats.totalSessions} session
          {practiceStats.totalSessions > 1 ? "s" : ""} · {practiceStats.totalMinutes} min
        </p>
      )}
    </div>
  );
}
