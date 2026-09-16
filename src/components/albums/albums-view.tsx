"use client";

import { useState } from "react";
import type { AlbumReview, AlbumWishlistItem, UserPlan } from "@/types";
import { AlbumReviewCard } from "./album-review-card";
import { AddAlbumModal } from "./add-album-modal";
import { AlbumRecommendations } from "./album-recommendations";
import { AlbumWishlistCard } from "./album-wishlist-card";
import { AddToAlbumWishlistModal } from "./add-to-album-wishlist-modal";
import { removeFromAlbumWishlist } from "@/lib/actions/album-wishlist";
import { useBiblioSearch } from "@/components/biblio/biblio-search";

interface AlbumsViewProps {
  initialReviews: AlbumReview[];
  initialWishlist: AlbumWishlistItem[];
  userPlan: UserPlan;
}

export function AlbumsView({ initialReviews, initialWishlist, userPlan }: AlbumsViewProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reviews" | "wishlist" | "recommendations">("reviews");
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [reviewFromWishlist, setReviewFromWishlist] = useState<AlbumWishlistItem | null>(null);
  const [starFilter, setStarFilter] = useState(0);
  const { query: searchQuery, setQuery: setSearchQuery } = useBiblioSearch();
  const isPaid = userPlan !== "free";

  // Recherche insensible a la casse et aux accents, sur le titre et l'artiste
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const query = normalize(searchQuery.trim());
  const matchesSearch = (album: { album_name: string; artist_name: string }) =>
    !query ||
    normalize(album.album_name).includes(query) ||
    normalize(album.artist_name).includes(query);

  // starFilter: 0 = all, 1–5 = exact star bucket (e.g. 4 = ratings 4★ and 4.5★, db 8–9)
  const filteredReviews = reviews.filter(
    (r) =>
      matchesSearch(r) &&
      (starFilter === 0 || (r.rating >= starFilter * 2 && r.rating < (starFilter + 1) * 2))
  );

  const filteredWishlist = wishlist.filter(matchesSearch);

  const hasActiveFilters = query.length > 0 || starFilter > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setStarFilter(0);
  };

  const handleReviewAdded = (review: AlbumReview) => {
    setReviews((prev) => [review, ...prev]);
    setIsAddModalOpen(false);

    // Si la review vient de la wishlist, retirer l'album de la wishlist
    if (reviewFromWishlist) {
      handleRemoveFromWishlist(reviewFromWishlist.id);
      setReviewFromWishlist(null);
    }
  };

  const handleReviewDeleted = (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const handleReviewUpdated = (updated: AlbumReview) => {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleWishlistAdded = (album: AlbumWishlistItem) => {
    setWishlist((prev) => [album, ...prev]);
  };

  const handleRemoveFromWishlist = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    const result = await removeFromAlbumWishlist(id);
    if (result.success) {
      setWishlist((prev) => prev.filter((a) => a.id !== id));
    }
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleListenFromWishlist = (album: AlbumWishlistItem) => {
    setReviewFromWishlist(album);
    setIsAddModalOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Albums</h1>
          <p className="mt-1 text-muted-foreground">
            Tes écoutes et impressions
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "wishlist" ? (
            <button
              onClick={() => setIsWishlistModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Ajouter
            </button>
          ) : activeTab === "reviews" ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Ajouter
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-accent/50 p-1">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "reviews"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mes écoutes ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "wishlist"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          A écouter ({wishlist.length})
        </button>
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "recommendations"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Recos
          {!isPaid && (
            <span className="ml-1.5 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">PRO</span>
          )}
        </button>
      </div>

      {/* Content - Reviews */}
      {activeTab === "reviews" && (
        <>
          {reviews.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {[0, 5, 4, 3, 2, 1].map((val) => {
                const isActive = starFilter === val;
                return (
                  <button
                    key={val}
                    onClick={() => setStarFilter(val)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {val === 0 ? (
                      "Toutes"
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px] text-primary">star</span>
                        {val}
                      </>
                    )}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <span className="text-sm text-muted-foreground">
                  {filteredReviews.length} résultat{filteredReviews.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {filteredReviews.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map((review) => (
                <AlbumReviewCard
                  key={review.id}
                  review={review}
                  onDeleted={handleReviewDeleted}
                  onUpdated={handleReviewUpdated}
                />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <span className="material-symbols-outlined mb-3 text-4xl text-muted-foreground">
                {query ? "search_off" : "filter_list"}
              </span>
              <p className="text-muted-foreground">
                {query
                  ? `Aucun album ne correspond a "${searchQuery.trim()}"`
                  : "Aucun album avec cette note"}
              </p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-3xl">album</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Aucun album</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Ajoute les albums que tu as écoutés, note-les et partage ton avis
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
              >
                Ajouter un album
              </button>
            </div>
          )}
        </>
      )}

      {/* Content - Wishlist */}
      {activeTab === "wishlist" && (
        <>
          {filteredWishlist.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredWishlist.map((album) => (
                <AlbumWishlistCard
                  key={album.id}
                  album={album}
                  onListen={() => handleListenFromWishlist(album)}
                  onRemove={() => handleRemoveFromWishlist(album.id)}
                  isRemoving={removingIds.has(album.id)}
                />
              ))}
            </div>
          ) : wishlist.length > 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <span className="material-symbols-outlined mb-3 text-4xl text-muted-foreground">search_off</span>
              <p className="text-muted-foreground">
                Aucun album ne correspond a &quot;{searchQuery.trim()}&quot;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-3xl">bookmark</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Aucun album en attente</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Ajoute les albums que tu aimerais écouter pour ne pas les oublier
              </p>
              <button
                onClick={() => setIsWishlistModalOpen(true)}
                className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
              >
                Ajouter un album
              </button>
            </div>
          )}
        </>
      )}

      {/* Content - Recommendations */}
      {activeTab === "recommendations" && (
        <AlbumRecommendations
          isPaid={isPaid}
          hasReviews={reviews.length > 0}
          onReviewAdded={(review) => {
            setReviews((prev) => [review, ...prev]);
          }}
          onWishlistAdded={(album) => {
            setWishlist((prev) => [album, ...prev]);
          }}
        />
      )}

      {/* Add Album Review Modal */}
      <AddAlbumModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setReviewFromWishlist(null);
        }}
        onAdded={handleReviewAdded}
        prefillAlbum={reviewFromWishlist ? {
          name: reviewFromWishlist.album_name,
          artists: reviewFromWishlist.artist_name.split(", ").map((name) => ({ name })),
          images: reviewFromWishlist.cover_url ? [{ url: reviewFromWishlist.cover_url, width: 300, height: 300 }] : [],
          id: reviewFromWishlist.spotify_id || "",
          external_urls: { spotify: reviewFromWishlist.spotify_url || "" },
          release_date: reviewFromWishlist.release_date || "",
          total_tracks: reviewFromWishlist.total_tracks || 0,
        } : undefined}
      />

      {/* Add to Album Wishlist Modal */}
      <AddToAlbumWishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        onSuccess={handleWishlistAdded}
      />
    </div>
  );
}
