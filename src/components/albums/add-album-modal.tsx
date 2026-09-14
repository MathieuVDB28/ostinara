"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { createAlbumReview } from "@/lib/actions/albums";
import { StarRating } from "@/components/ui/star-rating";
import type { AlbumReview, SpotifyAlbum } from "@/types";

interface AddAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (review: AlbumReview) => void;
  prefillAlbum?: SpotifyAlbum;
}

export function AddAlbumModal({ isOpen, onClose, onAdded, prefillAlbum }: AddAlbumModalProps) {
  const [step, setStep] = useState<"search" | "review">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [rating, setRating] = useState(3.5); // star value 0–5 (db = stars × 2)
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("search");
      setSearchQuery("");
      setResults([]);
      setSelectedAlbum(null);
      setRating(3.5);
      setReview("");
      setError("");
    } else if (prefillAlbum) {
      setSelectedAlbum(prefillAlbum);
      setStep("review");
    }
  }, [isOpen, prefillAlbum]);

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

  const handleSelectAlbum = (album: SpotifyAlbum) => {
    setSelectedAlbum(album);
    setStep("review");
  };

  const handleSubmit = async () => {
    if (!selectedAlbum) return;

    setSubmitting(true);
    setError("");

    const result = await createAlbumReview({
      album_name: selectedAlbum.name,
      artist_name: selectedAlbum.artists.map((a) => a.name).join(", "),
      cover_url: selectedAlbum.images[0]?.url,
      spotify_id: selectedAlbum.id,
      spotify_url: selectedAlbum.external_urls?.spotify,
      release_date: selectedAlbum.release_date,
      total_tracks: selectedAlbum.total_tracks,
      rating: Math.round(rating * 2),
      review: review.trim() || undefined,
    });

    if (result.success && result.data) {
      onAdded(result.data);
    } else {
      setError(result.error || "Une erreur est survenue");
    }

    setSubmitting(false);
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
          <div className="flex items-center gap-3">
            {step === "review" && (
              <button
                onClick={() => setStep("search")}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <h2 className="text-lg font-bold">
              {step === "search" ? "Chercher un album" : "Ton avis"}
            </h2>
          </div>
          <button aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "search" && (
            <div>
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

              {/* Results */}
              <div className="space-y-2">
                {results.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleSelectAlbum(album)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent"
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
                  </button>
                ))}
              </div>

              {searchQuery.length >= 2 && !searching && results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun album trouve
                </p>
              )}
            </div>
          )}

          {step === "review" && selectedAlbum && (
            <div>
              {/* Selected album preview */}
              <div className="mb-6 flex items-center gap-4">
                {selectedAlbum.images[0]?.url ? (
                  <Image
                    src={selectedAlbum.images[0].url}
                    alt={selectedAlbum.name}
                    className="h-20 w-20 rounded-xl object-cover"
                    width={80}
                    height={80}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground">album</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold">{selectedAlbum.name}</h3>
                  <p className="truncate text-muted-foreground">
                    {selectedAlbum.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium">Ta note</label>
                  <span className="text-sm font-semibold text-amber-400">
                    {rating > 0 ? `${rating} / 5` : "—"}
                  </span>
                </div>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {/* Review text */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium">
                  Ton impression <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Qu'est-ce que tu en as pense ?"
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {review.length}/2000
                </p>
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-500">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="shrink-0 border-t border-border p-5">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Publication..." : "Publier"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
