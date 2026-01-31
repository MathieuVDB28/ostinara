"use client";

import { useState } from "react";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import type { UserPlan } from "@/types";

interface SpotifyConnectSectionProps {
  connected: boolean;
  spotifyUserId?: string;
  connectedAt?: string;
  userPlan: UserPlan;
}

export function SpotifyConnectSection({
  connected,
  spotifyUserId,
  connectedAt,
  userPlan,
}: SpotifyConnectSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  if (userPlan === "free") {
    return (
      <ProUpsell
        feature="Intégration Spotify"
        description="Connecte ton compte Spotify pour importer tes playlists, voir tes écoutes récentes et obtenir les données audio de tes morceaux."
      />
    );
  }

  const handleDisconnect = async () => {
    if (!confirm("Déconnecter ton compte Spotify ?")) return;
    setDisconnecting(true);

    try {
      const response = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (response.ok) {
        window.location.reload();
      }
    } catch {
      setDisconnecting(false);
    }
  };

  if (connected) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Spotify connecté</h4>
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {spotifyUserId && (
                <p className="text-sm text-muted-foreground">@{spotifyUserId}</p>
              )}
              {connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Connecté le {new Date(connectedAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {disconnecting ? "..." : "Déconnecter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
          <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="mb-1 font-medium">Connecter Spotify</h4>
          <p className="mb-4 text-sm text-muted-foreground">
            Importe tes playlists, découvre tes écoutes récentes et accède aux données audio de tes morceaux.
          </p>
          <a
            href="/api/spotify/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#1ed760]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connecter Spotify
          </a>
        </div>
      </div>
    </div>
  );
}
