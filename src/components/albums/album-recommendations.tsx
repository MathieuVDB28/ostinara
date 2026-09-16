"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getAlbumRecommendations } from "@/lib/actions/albums";
import { addToAlbumWishlist } from "@/lib/actions/album-wishlist";
import { AddAlbumModal } from "./add-album-modal";
import type { AlbumReview, AlbumWishlistItem, SpotifyRecommendation } from "@/types";

interface AlbumRecommendationsProps {
  isPaid: boolean;
  hasReviews: boolean;
  onReviewAdded: (review: AlbumReview) => void;
  onWishlistAdded: (album: AlbumWishlistItem) => void;
}

export function AlbumRecommendations({
  isPaid,
  hasReviews,
  onReviewAdded,
  onWishlistAdded,
}: AlbumRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SpotifyRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action sheet state
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyRecommendation | null>(null);
  const [albumForReview, setAlbumForReview] = useState<SpotifyRecommendation | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [wishlistStatus, setWishlistStatus] = useState<Record<string, "loading" | "done">>({});

  useEffect(() => {
    if (isPaid && hasReviews && !loaded) {
      loadRecommendations();
    }
  }, [isPaid, hasReviews, loaded]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    const result = await getAlbumRecommendations();
    if (result.success && result.data) {
      setRecommendations(result.data);
    } else if (!result.success) {
      setError(result.error || "Erreur lors du chargement");
    }
    setLoading(false);
    setLoaded(true);
  };

  const handleAddToWishlist = async (album: SpotifyRecommendation) => {
    setWishlistStatus((prev) => ({ ...prev, [album.id]: "loading" }));
    const result = await addToAlbumWishlist({
      album_name: album.name,
      artist_name: album.artists.map((a) => a.name).join(", "),
      cover_url: album.images[0]?.url,
      spotify_id: album.id,
      spotify_url: album.external_urls?.spotify,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
    });
    if (result.success && result.album) {
      onWishlistAdded(result.album);
      setWishlistStatus((prev) => ({ ...prev, [album.id]: "done" }));
    } else {
      // reset on error so the user can retry
      setWishlistStatus((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
    }
    setSelectedAlbum(null);
  };

  const handleOpenReviewModal = (album: SpotifyRecommendation) => {
    setAlbumForReview(album);
    setSelectedAlbum(null);
    setShowReviewModal(true);
  };

  const handleReviewAdded = (review: AlbumReview) => {
    onReviewAdded(review);
    setShowReviewModal(false);
  };

  if (!isPaid) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-3xl">stars</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Fonctionnalité Pro</h3>
        <p className="mb-6 max-w-sm text-center text-muted-foreground">
          Passe en Pro pour obtenir des recommandations d&apos;albums personnalisées basées sur tes écoutes
        </p>
        <a href="/settings" className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground">
          Passer Pro
        </a>
      </div>
    );
  }

  if (!hasReviews) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-3xl">recommend</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Pas encore de recommandations</h3>
        <p className="max-w-sm text-center text-muted-foreground">
          Ajoute des albums écoutés pour recevoir des recommandations personnalisées
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement des recommandations...</p>
        </div>
      </div>
    );
  }

  if (loaded && (recommendations.length === 0 || error)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-3xl">recommend</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {error ? "Erreur de chargement" : "Aucune recommandation"}
        </h3>
        <p className="mb-4 max-w-sm text-center text-muted-foreground">
          {error ?? "Toutes les suggestions ont déjà été écoutées, réessaie plus tard."}
        </p>
        <button
          onClick={loadRecommendations}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Basé sur tes écoutes — clique sur un album pour l&apos;ajouter
          </p>
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Rafraîchir
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map((album) => {
            const status = wishlistStatus[album.id];
            return (
              <div
                key={album.id}
                onClick={() => status !== "done" && setSelectedAlbum(album)}
                className={`group relative overflow-hidden rounded-xl border bg-card transition-colors ${
                  status === "done"
                    ? "border-success/40 cursor-default"
                    : "border-border hover:border-primary/40 cursor-pointer"
                }`}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {album.images[0]?.url ? (
                    <img
                      src={album.images[0].url}
                      alt={album.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-muted-foreground">album</span>
                    </div>
                  )}

                  {/* Done badge */}
                  {status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
                        <span className="material-symbols-outlined text-[24px]">check</span>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay with hint */}
                  {status !== "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="material-symbols-outlined text-[32px] text-white">add_circle</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="truncate font-semibold">{album.name}</h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {album.artists.map((a) => a.name).join(", ")}
                  </p>
                  {album.release_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {album.release_date.split("-")[0]}
                    </p>
                  )}
                  {status === "done" && (
                    <p className="mt-1 text-xs font-medium text-success">Ajouté à écouter</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action sheet */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedAlbum(null)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Album info */}
            <div className="flex items-center gap-4 p-5">
              {selectedAlbum.images[0]?.url ? (
                <Image
                  src={selectedAlbum.images[0].url}
                  alt={selectedAlbum.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  width={64}
                  height={64}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <span className="material-symbols-outlined text-2xl text-muted-foreground">album</span>
                </div>
              )}
              <div className="min-w-0">
                <h3 className="truncate font-bold">{selectedAlbum.name}</h3>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedAlbum.artists.map((a) => a.name).join(", ")}
                </p>
                {selectedAlbum.release_date && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAlbum.release_date.split("-")[0]}
                    {selectedAlbum.total_tracks ? ` · ${selectedAlbum.total_tracks} titres` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="ml-auto shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 px-5 pb-6">
              <button
                onClick={() => handleAddToWishlist(selectedAlbum)}
                disabled={wishlistStatus[selectedAlbum.id] === "loading"}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-accent/50 px-4 py-3.5 text-left font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  {wishlistStatus[selectedAlbum.id] === "loading" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">À écouter</div>
                  <div className="text-xs text-muted-foreground">Ajouter à ta liste d&apos;attente</div>
                </div>
              </button>

              <button
                onClick={() => handleOpenReviewModal(selectedAlbum)}
                className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-left font-medium transition-colors hover:bg-primary/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <span className="material-symbols-outlined text-[20px]">star</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">J&apos;ai écouté — noter</div>
                  <div className="text-xs text-muted-foreground">Donner une note et un avis</div>
                </div>
              </button>

              {selectedAlbum.external_urls?.spotify && (
                <a
                  href={selectedAlbum.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/20">
                    <svg className="h-4 w-4 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-[#1DB954]">Écouter sur Spotify</div>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review modal — prefilled with the selected album */}
      <AddAlbumModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onAdded={handleReviewAdded}
        prefillAlbum={
          albumForReview
            ? {
                id: albumForReview.id,
                name: albumForReview.name,
                artists: albumForReview.artists,
                images: albumForReview.images,
                external_urls: albumForReview.external_urls,
                release_date: albumForReview.release_date,
                total_tracks: albumForReview.total_tracks,
              }
            : undefined
        }
      />
    </>
  );
}
