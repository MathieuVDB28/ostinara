"use client";

import { useState, useEffect, useCallback } from "react";
import { importSpotifyPlaylist } from "@/lib/actions/spotify";
import type { SpotifyPlaylist } from "@/types";

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormattedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover_url: string;
  spotify_id: string;
  preview_url: string | null;
}

type Step = "playlists" | "tracks";

export function ImportPlaylistModal({ isOpen, onClose, onSuccess }: ImportPlaylistModalProps) {
  const [step, setStep] = useState<Step>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<FormattedTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [existingSpotifyIds, setExistingSpotifyIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load playlists when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("playlists");
      setSelectedPlaylist(null);
      setResult(null);
      setError(null);
      setLoadingPlaylists(true);

      fetch("/api/spotify/playlists")
        .then((res) => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then((data) => setPlaylists(data.items || []))
        .catch(() => setError("Erreur lors du chargement des playlists"))
        .finally(() => setLoadingPlaylists(false));
    }
  }, [isOpen]);

  const handleSelectPlaylist = async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setStep("tracks");
    setLoadingTracks(true);
    setError(null);

    try {
      const response = await fetch(`/api/spotify/playlists/${playlist.id}/tracks`);
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setTracks(data.tracks || []);

      // Pre-select all non-existing tracks
      const newSelected = new Set<string>();
      (data.tracks as FormattedTrack[]).forEach((t) => {
        if (!existingSpotifyIds.has(t.spotify_id)) {
          newSelected.add(t.spotify_id);
        }
      });
      setSelectedTrackIds(newSelected);
    } catch {
      setError("Erreur lors du chargement des morceaux");
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleToggleTrack = (spotifyId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotifyId)) {
        next.delete(spotifyId);
      } else {
        next.add(spotifyId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const selectableIds = tracks
      .filter((t) => !existingSpotifyIds.has(t.spotify_id))
      .map((t) => t.spotify_id);

    if (selectedTrackIds.size === selectableIds.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(selectableIds));
    }
  };

  const handleImport = async () => {
    if (!selectedPlaylist || selectedTrackIds.size === 0) return;

    setImporting(true);
    setError(null);

    const res = await importSpotifyPlaylist(
      selectedPlaylist.id,
      Array.from(selectedTrackIds)
    );

    if (res.success) {
      setResult({ imported: res.imported, skipped: res.skipped });
      // Add imported IDs to existing set
      setExistingSpotifyIds((prev) => {
        const next = new Set(prev);
        selectedTrackIds.forEach((id) => next.add(id));
        return next;
      });
      onSuccess();
    } else {
      setError(res.error || "Erreur lors de l'import");
    }

    setImporting(false);
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const selectableCount = tracks.filter((t) => !existingSpotifyIds.has(t.spotify_id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {step === "tracks" && (
              <button
                onClick={() => setStep("playlists")}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="font-semibold">
                {step === "playlists" ? "Importer de Spotify" : selectedPlaylist?.name}
              </h2>
              {step === "tracks" && (
                <p className="text-xs text-muted-foreground">
                  {selectedTrackIds.size} morceau{selectedTrackIds.size > 1 ? "x" : ""} sélectionné{selectedTrackIds.size > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="mx-6 mt-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-500">
              {result.imported} morceau{result.imported > 1 ? "x" : ""} importé{result.imported > 1 ? "s" : ""}
              {result.skipped > 0 && ` (${result.skipped} déjà dans ta bibliothèque)`}
            </div>
          )}

          {/* Playlists step */}
          {step === "playlists" && (
            <div className="p-4">
              {loadingPlaylists ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : playlists.length > 0 ? (
                <div className="space-y-2">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleSelectPlaylist(playlist)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                    >
                      {playlist.images[0] ? (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {playlist.tracks.total} morceau{playlist.tracks.total > 1 ? "x" : ""}
                          {playlist.owner && ` - ${playlist.owner.display_name}`}
                        </p>
                      </div>
                      <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aucune playlist trouvée
                </div>
              )}
            </div>
          )}

          {/* Tracks step */}
          {step === "tracks" && (
            <div className="p-4">
              {loadingTracks ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : (
                <>
                  {/* Select all */}
                  {selectableCount > 0 && (
                    <button
                      onClick={handleSelectAll}
                      className="mb-3 text-sm font-medium text-primary hover:underline"
                    >
                      {selectedTrackIds.size === selectableCount ? "Tout désélectionner" : "Tout sélectionner"}
                    </button>
                  )}

                  <div className="space-y-1">
                    {tracks.map((track) => {
                      const isExisting = existingSpotifyIds.has(track.spotify_id);
                      const isSelected = selectedTrackIds.has(track.spotify_id);

                      return (
                        <button
                          key={track.spotify_id}
                          onClick={() => !isExisting && handleToggleTrack(track.spotify_id)}
                          disabled={isExisting}
                          className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                            isExisting
                              ? "opacity-50"
                              : isSelected
                              ? "bg-primary/10"
                              : "hover:bg-accent"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isExisting
                              ? "border-muted bg-muted"
                              : isSelected
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}>
                            {(isSelected || isExisting) && (
                              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {track.cover_url ? (
                            <img
                              src={track.cover_url}
                              alt={track.album}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13" />
                              </svg>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{track.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                          </div>

                          {isExisting && (
                            <span className="shrink-0 text-xs text-muted-foreground">Déjà ajouté</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "tracks" && !loadingTracks && !result && (
          <div className="border-t border-border px-6 py-4">
            <button
              onClick={handleImport}
              disabled={importing || selectedTrackIds.size === 0}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {importing
                ? "Import en cours..."
                : `Importer ${selectedTrackIds.size} morceau${selectedTrackIds.size > 1 ? "x" : ""}`}
            </button>
          </div>
        )}

        {result && (
          <div className="border-t border-border px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
