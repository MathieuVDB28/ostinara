"use client";

import { useState, useEffect } from "react";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import type { UserPlan } from "@/types";

interface SpotifyTrackFormatted {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover_url: string;
  spotify_id: string;
  preview_url: string | null;
}

interface SpotifySuggestionsProps {
  userPlan: UserPlan;
  spotifyConnected: boolean;
  existingSpotifyIds: string[];
  onAddSong: (track: SpotifyTrackFormatted) => void;
}

const DISMISSED_KEY = "ostinara_spotify_suggestions_dismissed";

export function SpotifySuggestions({
  userPlan,
  spotifyConnected,
  existingSpotifyIds,
  onAddSong,
}: SpotifySuggestionsProps) {
  const [tracks, setTracks] = useState<SpotifyTrackFormatted[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "true") {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (userPlan === "free" || !spotifyConnected || dismissed) return;

    setLoading(true);
    fetch("/api/spotify/recently-played")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        const existingSet = new Set(existingSpotifyIds);
        const filtered = (data.tracks as SpotifyTrackFormatted[])
          .filter((t) => !existingSet.has(t.spotify_id))
          .slice(0, 10);
        setTracks(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userPlan, spotifyConnected, existingSpotifyIds, dismissed]);

  if (dismissed) return null;

  if (userPlan === "free") {
    return (
      <div className="mb-6">
        <ProUpsell
          feature="Suggestions Spotify"
          description="Vois tes écoutes récentes et ajoute-les à ta bibliothèque en un clic."
          compact
        />
      </div>
    );
  }

  if (!spotifyConnected) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm">
        <svg className="h-5 w-5 shrink-0 text-green-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <span className="text-muted-foreground">
          Connecte ton Spotify dans{" "}
          <a href="/profile/edit" className="text-primary hover:underline">
            ton profil
          </a>
          {" "}pour voir tes suggestions.
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 w-28 shrink-0 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <h3 className="text-sm font-medium">Tes écoutes récentes</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Masquer
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tracks.map((track) => (
          <div
            key={track.spotify_id}
            className="group relative w-28 shrink-0"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg">
              {track.cover_url ? (
                <img
                  src={track.cover_url}
                  alt={track.album}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => onAddSong(track)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>
            </div>
            <p className="mt-1.5 truncate text-xs font-medium">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
