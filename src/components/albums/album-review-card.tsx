"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteAlbumReview, updateAlbumReview } from "@/lib/actions/albums";
import { StarRating } from "@/components/ui/star-rating";
import type { AlbumReview } from "@/types";

interface AlbumReviewCardProps {
  review: AlbumReview;
  onDeleted: (id: string) => void;
  onUpdated: (updated: AlbumReview) => void;
}

// rating is stored as 0–10 integer (db value = stars × 2)
function starsFromDb(dbRating: number) {
  return dbRating / 2;
}

export function AlbumReviewCard({ review, onDeleted, onUpdated }: AlbumReviewCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(starsFromDb(review.rating));
  const [editReview, setEditReview] = useState(review.review || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAlbumReview(review.id);
    if (result.success) {
      onDeleted(review.id);
    }
    setIsDeleting(false);
    setShowMenu(false);
  };

  const handleEdit = () => {
    setEditRating(starsFromDb(review.rating));
    setEditReview(review.review || "");
    setEditError("");
    setIsEditing(true);
    setShowMenu(false);
    setShowDetail(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setEditError("");

    const result = await updateAlbumReview(review.id, {
      rating: Math.round(editRating * 2),
      review: editReview.trim() || undefined,
    });

    if (result.success) {
      onUpdated({
        ...review,
        rating: Math.round(editRating * 2),
        review: editReview.trim() || undefined,
        updated_at: new Date().toISOString(),
      });
      setIsEditing(false);
    } else {
      setEditError(result.error || "Une erreur est survenue");
    }
    setIsUpdating(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditRating(starsFromDb(review.rating));
    setEditReview(review.review || "");
    setEditError("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleCardClick = () => {
    if (review.spotify_id) {
      router.push(`/albums/${review.spotify_id}`);
    } else {
      setShowDetail(true);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80"
      >
        {/* Cover image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {review.cover_url ? (
            <img
              src={review.cover_url}
              alt={review.album_name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">album</span>
            </div>
          )}

          {/* Rating badge */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
            <span className="material-symbols-outlined text-[13px] text-primary">star</span>
            {starsFromDb(review.rating)}
          </div>

          {/* Menu button */}
          <div className="absolute right-2 bottom-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <div className="absolute right-0 bottom-10 z-20 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Modifier
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    {isDeleting ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="truncate font-semibold">{review.album_name}</h3>
          <Link
            href={`/artists/by-name?q=${encodeURIComponent(review.artist_name)}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {review.artist_name}
          </Link>

          {review.review && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground italic">
              &ldquo;{review.review}&rdquo;
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {formatDate(review.created_at)}
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDetail(false)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {/* Header image */}
            <div className="relative h-64 shrink-0 overflow-hidden bg-muted">
              {review.cover_url ? (
                <img
                  src={review.cover_url}
                  alt={review.album_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-7xl text-muted-foreground">album</span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {/* Close button */}
              <button
                onClick={() => { setShowDetail(false); setIsEditing(false); }}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              {/* Album info overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white">{review.album_name}</h2>
                <Link
                  href={`/artists/by-name?q=${encodeURIComponent(review.artist_name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {review.artist_name}
                </Link>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {isEditing ? (
                <>
                  {/* Edit Rating */}
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium">Ta note</label>
                      <span className="text-sm font-semibold text-primary">
                        {editRating > 0 ? `${editRating} / 5` : "—"}
                      </span>
                    </div>
                    <StarRating value={editRating} onChange={setEditRating} size="lg" />
                  </div>

                  {/* Edit Review */}
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium">
                      Ton impression <span className="text-muted-foreground">(optionnel)</span>
                    </label>
                    <textarea
                      value={editReview}
                      onChange={(e) => setEditReview(e.target.value)}
                      placeholder="Qu'est-ce que tu en as pensé ?"
                      rows={4}
                      maxLength={2000}
                      className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {editReview.length}/2000
                    </p>
                  </div>

                  {editError && (
                    <p className="mb-4 text-sm text-destructive">{editError}</p>
                  )}

                  {/* Edit Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="flex-1 rounded-xl border border-border py-3 font-medium transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isUpdating ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Rating */}
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StarRating value={starsFromDb(review.rating)} size="md" />
                      <span className="text-sm font-semibold text-primary">
                        {starsFromDb(review.rating)} / 5
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(review.created_at)}
                      </span>
                      <button
                        onClick={() => handleEdit()}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Modifier
                      </button>
                    </div>
                  </div>

                  {/* Album metadata */}
                  {(review.release_date || review.total_tracks) && (
                    <div className="mb-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {review.release_date && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {review.release_date.split("-")[0]}
                        </span>
                      )}
                      {review.total_tracks && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">music_note</span>
                          {review.total_tracks} titres
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review */}
                  {review.review ? (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Impression</h3>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {review.review}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Aucune impression ajoutee
                    </p>
                  )}

                  {/* Spotify link */}
                  {review.spotify_url && (
                    <a
                      href={review.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-center gap-2 rounded-xl bg-[#1DB954]/10 px-4 py-3 text-sm font-medium text-[#1DB954] transition-colors hover:bg-[#1DB954]/20"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Écouter sur Spotify
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
