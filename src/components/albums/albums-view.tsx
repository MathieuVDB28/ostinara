"use client";

import { useState } from "react";
import type { AlbumReview, AlbumWishlistItem, UserPlan, WeeklyAlbums } from "@/types";
import { AlbumReviewCard } from "./album-review-card";
import { AddAlbumModal } from "./add-album-modal";
import { AlbumRecommendations } from "./album-recommendations";
import { AlbumWishlistCard } from "./album-wishlist-card";
import { WeeklyAlbumsView } from "./weekly-albums-view";
import { AddToAlbumWishlistModal } from "./add-to-album-wishlist-modal";
import { removeFromAlbumWishlist } from "@/lib/actions/album-wishlist";
import { useBiblioSearch } from "@/components/biblio/biblio-search";
import Link from "next/link";
import { Bookmark, Disc3, ListFilter, Plus, SearchX, Star } from "lucide-react";
import { Cover } from "@/components/ui/cover";

type AlbumsTab = "reviews" | "wishlist" | "week" | "recommendations";

const TABS: { value: AlbumsTab; label: string }[] = [
  { value: "reviews", label: "Mes écoutes" },
  { value: "wishlist", label: "À écouter" },
  { value: "week", label: "Semaine" },
  { value: "recommendations", label: "Recos" },
];

const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CHIP_IDLE = "border-border text-muted-foreground hover:text-foreground";
const CHIP_ACTIVE = "border-border bg-secondary text-foreground";

interface AlbumsViewProps {
  initialReviews: AlbumReview[];
  initialWishlist: AlbumWishlistItem[];
  initialWeeklyAlbums: WeeklyAlbums | null;
  userPlan: UserPlan;
}

export function AlbumsView({
  initialReviews,
  initialWishlist,
  initialWeeklyAlbums,
  userPlan,
}: AlbumsViewProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AlbumsTab>("reviews");
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

  // 10 en base = 5 etoiles
  const favorites = reviews.filter((r) => r.rating === 10);

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
      {/*
        Onglets, filtre par etoiles et ajout sur une seule rangee. Le titre
        « Albums » et son sous-titre repetaient le segment juste au-dessus.
      */}
      <div className="flex items-center gap-1.5">
        <div
          role="group"
          aria-label="Vues des albums"
          className="-ml-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 pl-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:ml-0 lg:pl-0 [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count =
              tab.value === "reviews" ? reviews.length : tab.value === "wishlist" ? wishlist.length : null;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                aria-pressed={isActive}
                className={`${CHIP} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {tab.label}
                {count !== null && <span className="tabular opacity-70">{count}</span>}
                {tab.value === "recommendations" && !isPaid && (
                  <span className="rounded bg-primary/15 px-1 text-[10px] font-bold text-primary">PRO</span>
                )}
              </button>
            );
          })}

          {activeTab === "reviews" && reviews.length > 0 && (
            <>
              <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 self-center bg-border" />
              {[5, 4, 3, 2, 1].map((val) => {
                const isActive = starFilter === val;
                return (
                  <button
                    key={val}
                    onClick={() => setStarFilter(isActive ? 0 : val)}
                    aria-pressed={isActive}
                    aria-label={`${val} étoile${val > 1 ? "s" : ""}`}
                    className={`${CHIP} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
                  >
                    <Star className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                    {val}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {(activeTab === "reviews" || activeTab === "wishlist") && (
          <button
            onClick={() => (activeTab === "wishlist" ? setIsWishlistModalOpen(true) : setIsAddModalOpen(true))}
            aria-label={activeTab === "wishlist" ? "Ajouter un album à écouter" : "Ajouter une écoute"}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        )}
      </div>

      <div aria-hidden="true" className="-mx-4 mb-5 mt-3 h-px bg-border lg:mx-0" />

      {/* Content - Reviews */}
      {activeTab === "reviews" && (
        <>
          {hasActiveFilters && (
            <p className="mb-3 text-sm text-muted-foreground">
              {filteredReviews.length} résultat{filteredReviews.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Les coups de coeur en etagere, avant la grille complete */}
          {!hasActiveFilters && favorites.length > 1 && (
            <section aria-labelledby="albums-favorites" className="mb-6">
              <h2 id="albums-favorites" className="mb-2.5 text-lg font-extrabold tracking-[-0.01em]">
                Tes 5 étoiles
                <span className="tabular font-bold text-muted-foreground">
                  <span aria-hidden="true"> · </span>
                  {favorites.length}
                </span>
              </h2>
              <div className="-mx-4 flex snap-x snap-proximity scroll-pl-4 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:scroll-pl-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                {favorites.map((review, index) => (
                  <Link
                    key={review.id}
                    href={review.spotify_id ? `/albums/${review.spotify_id}` : `/artists/by-name?q=${encodeURIComponent(review.artist_name)}`}
                    className="w-[104px] shrink-0 snap-start lg:w-[132px]"
                  >
                    <Cover
                      src={review.cover_url}
                      alt=""
                      className={`h-[104px] w-[104px] shadow-[-6px_0_12px_-4px_rgb(0_0_0/0.45)] lg:h-[132px] lg:w-[132px] ${index === 0 ? "rounded-l-md" : ""}`}
                    />
                    <span className="block truncate pr-2 pt-1.5 text-xs font-semibold">{review.album_name}</span>
                    <span className="block truncate pr-2 text-[11.5px] text-muted-foreground">{review.artist_name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!hasActiveFilters && favorites.length > 1 && (
            <h2 className="mb-2.5 text-lg font-extrabold tracking-[-0.01em]">
              Toutes tes écoutes
              <span className="tabular font-bold text-muted-foreground">
                <span aria-hidden="true"> · </span>
                {reviews.length}
              </span>
            </h2>
          )}

          {filteredReviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {query ? (
                <SearchX className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <ListFilter className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              )}
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Disc3 className="mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
              <h3 className="mb-2 text-lg font-semibold">Aucun album</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Ajoute les albums que tu as écoutés, note-les et partage ton avis
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchX className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bookmark className="mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
              <h3 className="mb-2 text-lg font-semibold">Aucun album en attente</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Ajoute les albums que tu aimerais écouter pour ne pas les oublier
              </p>
              <button
                onClick={() => setIsWishlistModalOpen(true)}
                className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Ajouter un album
              </button>
            </div>
          )}
        </>
      )}

      {/* Content - Recommendations */}
      {/* Content - Albums de la semaine */}
      {activeTab === "week" && initialWeeklyAlbums && (
        <WeeklyAlbumsView initial={initialWeeklyAlbums} query={searchQuery} />
      )}

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
