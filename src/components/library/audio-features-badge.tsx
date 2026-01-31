"use client";

import { useState } from "react";
import { fetchAndCacheAudioFeatures } from "@/lib/actions/spotify";
import type { UserPlan, SongAudioFeatures } from "@/types";

interface AudioFeaturesBadgeProps {
  bpm?: number;
  musicalKey?: string;
  energy?: number;
  compact?: boolean;
  spotifyId?: string;
  songId?: string;
  userPlan?: UserPlan;
  onFetched?: (features: SongAudioFeatures) => void;
}

function getEnergyColor(energy: number): string {
  if (energy < 0.33) return "bg-blue-500";
  if (energy < 0.66) return "bg-yellow-500";
  return "bg-red-500";
}

function getEnergyLabel(energy: number): string {
  if (energy < 0.33) return "Calme";
  if (energy < 0.66) return "Modéré";
  return "Intense";
}

export function AudioFeaturesBadge({
  bpm,
  musicalKey,
  energy,
  compact,
  spotifyId,
  songId,
  userPlan,
  onFetched,
}: AudioFeaturesBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [localFeatures, setLocalFeatures] = useState<SongAudioFeatures | null>(null);

  const displayBpm = localFeatures?.bpm ?? bpm;
  const displayKey = localFeatures?.key ?? musicalKey;
  const displayEnergy = localFeatures?.energy ?? energy;

  const hasFeatures = displayBpm != null || displayKey != null || displayEnergy != null;

  if (userPlan === "free") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-xs text-muted-foreground">Données audio</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Pro</span>
      </div>
    );
  }

  const handleFetch = async () => {
    if (!songId || !spotifyId) return;
    setLoading(true);
    const result = await fetchAndCacheAudioFeatures(songId);
    if (result.success && result.features) {
      setLocalFeatures(result.features);
      onFetched?.(result.features);
    }
    setLoading(false);
  };

  if (!hasFeatures && spotifyId && songId) {
    return (
      <button
        onClick={handleFetch}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Analyse...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            Analyser via Spotify
          </>
        )}
      </button>
    );
  }

  if (!hasFeatures) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {displayBpm != null && (
          <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
            {Math.round(displayBpm)} BPM
          </span>
        )}
        {displayKey && (
          <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
            {displayKey}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayBpm != null && (
        <div className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm font-medium">{Math.round(displayBpm)}</span>
          <span className="text-xs text-muted-foreground">BPM</span>
        </div>
      )}
      {displayKey && (
        <div className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13" />
          </svg>
          <span className="text-sm font-medium">{displayKey}</span>
        </div>
      )}
      {displayEnergy != null && (
        <div className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${getEnergyColor(displayEnergy)}`}
              style={{ width: `${displayEnergy * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{getEnergyLabel(displayEnergy)}</span>
        </div>
      )}
    </div>
  );
}
