"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { addToAlbumWishlist } from "@/lib/actions/album-wishlist";
import type { SpotifyAlbum, CreateAlbumWishlistInput } from "@/types";

interface AddToAlbumWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (album: import("@/types").AlbumWishlistItem) => void;
}

export function AddToAlbumWishlistModal({ isOpen, onClose, onSuccess }: AddToAlbumWishlistModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=album`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        console.error("Search error");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSelectAlbum = async (album: SpotifyAlbum) => {
    setSaving(true);
    setError(null);

    const input: CreateAlbumWishlistInput = {
      album_name: album.name,
      artist_name: album.artists.map((a) => a.name).join(", "),
      cover_url: album.images[0]?.url,
      spotify_id: album.id,
      spotify_url: album.external_urls?.spotify,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
    };

    const result = await addToAlbumWishlist(input);

    if (result.success && result.album) {
      onSuccess(result.album);
      onClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }

    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-bold">Ajouter à la wishlist</h2>
          <button aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Search input */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted-foreground">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher un album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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
          <div className="space-y-2">
            {results.map((album) => (
              <button
                key={album.id}
                onClick={() => handleSelectAlbum(album)}
                disabled={saving}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                {album.images[0]?.url ? (
                  <Image
                    src={album.images[0].url}
                    alt={album.name}
                    className="h-14 w-14 rounded-lg object-cover"
                    width={56}
                    height={56}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                    <span className="material-symbols-outlined text-xl text-muted-foreground">album</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{album.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {album.artists.map((a) => a.name).join(", ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {album.release_date?.split("-")[0]}
                    {album.total_tracks ? ` - ${album.total_tracks} titres` : ""}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[20px] text-muted-foreground">add</span>
              </button>
            ))}
          </div>

          {searchQuery.length >= 2 && !searching && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun album trouvé
            </p>
          )}

          {searchQuery.length < 2 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Recherche un album à ajouter à ta wishlist
            </p>
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
