"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { useRouter } from "next/navigation";
import { deleteAlbumReview, updateAlbumReview } from "@/lib/actions/albums";
import { EllipsisVertical, Heart, Pencil, Star, Trash2 } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { StarRating } from "@/components/ui/star-rating";
import type { AlbumReview } from "@/types";
import { Icon } from "@/components/ui/icon";
import { ListenLink } from "@/components/ui/listen-link";
import { deezerUrl } from "@/lib/services/deezer";

interface AlbumReviewCardProps {
  review: AlbumReview;
  onDeleted: (id: string) => void;
  onUpdated: (updated: AlbumReview) => void;
}

// rating is stored as 0–10 integer (db value = stars × 2)
function starsFromDb(dbRating: number) {
  return dbRating / 2;
}

/** « 4,5 » en francais, « 4.5 » en anglais. */
function formatStars(dbRating: number, intlLocale: string) {
  return starsFromDb(dbRating).toLocaleString(intlLocale);
}

export function AlbumReviewCard({ review, onDeleted, onUpdated }: AlbumReviewCardProps) {
  const t = useTranslations("albums.review");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
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
      setEditError(result.error || tc("genericError"));
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
    return new Date(dateString).toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleCardClick = () => {
    if (review.deezer_id) {
      router.push(`/albums/${review.deezer_id}`);
    } else {
      setShowDetail(true);
    }
  };

  return (
    <>
      {/*
        Une tuile, pas une carte : la pochette porte la note, le texte
        repose sur le fond (style Etagere, docs/refonte-ui.md).
      */}
      <div onClick={handleCardClick} className="group relative min-w-0 cursor-pointer">
        <Cover src={review.cover_url} alt={review.album_name} className="aspect-square w-full rounded-md">
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 font-display text-[13px] font-bold tracking-[0.03em] text-white">
            <Star className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
            {formatStars(review.rating, intlLocale)}
            <span className="sr-only">{t("outOf5")}</span>
          </span>

          {/* Menu : visible au doigt, revele au survol sur ordi */}
          <div className="absolute bottom-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label={t("options", { album: review.album_name })}
              aria-expanded={showMenu}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <EllipsisVertical className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <div className="absolute bottom-10 right-0 z-20 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-md">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    {tc("edit")}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    {isDeleting ? tc("deleting") : tc("delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </Cover>

        <div className="pt-2">
          <h3 className="truncate text-sm font-semibold">{review.album_name}</h3>
          <Link
            href={`/artists/by-name?q=${encodeURIComponent(review.artist_name)}`}
            onClick={(e) => e.stopPropagation()}
            className="block truncate text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {review.artist_name}
          </Link>

          {review.favorite_tracks?.length > 0 && (
            <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-muted-foreground">
              <Heart className="h-3 w-3 shrink-0 fill-primary text-primary" strokeWidth={0} aria-label={t("favorite", { count: review.favorite_tracks.length })} />
              <span className="truncate">{review.favorite_tracks.map((track) => track.name).join(", ")}</span>
            </p>
          )}

          {review.review && (
            <p className="mt-1.5 line-clamp-2 font-serif text-[13px] italic leading-snug text-foreground/80">
              &ldquo;{review.review}&rdquo;
            </p>
          )}

          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(review.created_at)}</p>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDetail(false)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md">
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
                  <Icon name="album" className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {/* Close button */}
              <button
                onClick={() => { setShowDetail(false); setIsEditing(false); }}
                aria-label={tc("close")}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <Icon name="close" className="h-[20px] w-[20px]" />
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
                      <label className="text-sm font-medium">{t("yourRating")}</label>
                      <span className="text-sm font-semibold text-primary">
                        {editRating > 0 ? t("ratingValue", { rating: editRating.toLocaleString(intlLocale) }) : "—"}
                      </span>
                    </div>
                    <StarRating value={editRating} onChange={setEditRating} size="lg" />
                  </div>

                  {/* Edit Review */}
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium">
                      {t("impression")} <span className="text-muted-foreground">{t("optional")}</span>
                    </label>
                    <textarea
                      value={editReview}
                      onChange={(e) => setEditReview(e.target.value)}
                      placeholder={t("placeholder")}
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
                      {tc("cancel")}
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isUpdating ? tc("saving") : tc("save")}
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
                        {t("ratingValue", { rating: formatStars(review.rating, intlLocale) })}
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
                        <Icon name="edit" className="h-[16px] w-[16px]" />
                        {tc("edit")}
                      </button>
                    </div>
                  </div>

                  {/* Album metadata */}
                  {(review.release_date || review.total_tracks) && (
                    <div className="mb-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {review.release_date && (
                        <span className="flex items-center gap-1">
                          <Icon name="calendar_today" className="h-[16px] w-[16px]" />
                          {review.release_date.split("-")[0]}
                        </span>
                      )}
                      {review.total_tracks && (
                        <span className="flex items-center gap-1">
                          <Icon name="music_note" className="h-[16px] w-[16px]" />
                          {t("tracks", { count: review.total_tracks })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review */}
                  {review.review ? (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t("impressionTitle")}</h3>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {review.review}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      {t("none")}
                    </p>
                  )}

                  {/* Lien d'ecoute */}
                  {review.deezer_id && (
                    <ListenLink href={deezerUrl("album", review.deezer_id)} className="mt-5" />
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
