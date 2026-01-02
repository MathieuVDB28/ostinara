"use client";

import { useState, useEffect, useCallback } from "react";
import { addToWishlist } from "@/lib/actions/wishlist";
import type { CreateWishlistSongInput } from "@/types";

interface SpotifyResult {
  title: string;
  artist: string;
  album: string;
  cover_url: string;
  spotify_id: string;
  preview_url: string | null;
}

interface AddToWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToWishlistModal({ isOpen, onClose, onSuccess }: AddToWishlistModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch {
        console.error("Search error");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTrack = async (track: SpotifyResult) => {
    setSaving(true);
    setError(null);

    const input: CreateWishlistSongInput = {
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover_url: track.cover_url,
      spotify_id: track.spotify_id,
      preview_url: track.preview_url || undefined,
    };

    const result = await addToWishlist(input);

    if (result.success) {
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }

    setSaving(false);
  };

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Ajouter à la wishlist</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un morceau..."
            className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {results.map((track) => (
            <button
              key={track.spotify_id}
              onClick={() => handleSelectTrack(track)}
              disabled={saving}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              {track.cover_url ? (
                <img
                  src={track.cover_url}
                  alt={track.album}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{track.title}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {track.artist}
                </div>
              </div>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ))}

          {query && !loading && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Aucun résultat pour &quot;{query}&quot;
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-muted-foreground">
              Recherche un morceau à ajouter à ta wishlist
            </div>
          )}
        </div>

        {saving && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Ajout en cours...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
