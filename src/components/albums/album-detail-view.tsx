"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/ui/star-rating";
import { updateAlbumReview, deleteAlbumReview } from "@/lib/actions/albums";
import type { SpotifyAlbumDetails, AlbumReview, AlbumCommunityStats } from "@/types";

interface Props {
  album: SpotifyAlbumDetails;
  stats: AlbumCommunityStats | null;
  userReview: AlbumReview | null;
}

function starsFromDb(dbRating: number) {
  return dbRating / 2;
}

export function AlbumDetailView({ album, stats, userReview: initialReview }: Props) {
  const router = useRouter();
  const [userReview, setUserReview] = useState(initialReview);
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(initialReview ? starsFromDb(initialReview.rating) : 0);
  const [editReview, setEditReview] = useState(initialReview?.review || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState("");

  const mainArtist = album.artists[0];
  const year = album.release_date?.split("-")[0];
  const avgStars = stats ? stats.avg_rating / 2 : null;

  const handleUpdate = async () => {
    if (!userReview) return;
    setIsUpdating(true);
    setEditError("");

    const result = await updateAlbumReview(userReview.id, {
      rating: Math.round(editRating * 2),
      review: editReview.trim() || undefined,
    });

    if (result.success) {
      setUserReview({
        ...userReview,
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

  const handleDelete = async () => {
    if (!userReview) return;
    setIsDeleting(true);
    const result = await deleteAlbumReview(userReview.id);
    if (result.success) {
      setUserReview(null);
      setIsEditing(false);
    }
    setIsDeleting(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userReview) {
      setEditRating(starsFromDb(userReview.rating));
      setEditReview(userReview.review || "");
    }
    setEditError("");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Retour
      </button>

      {/* Album header */}
      <div className="flex gap-5 sm:gap-7">
        <div className="shrink-0">
          {album.images[0] ? (
            <Image
              src={album.images[0].url}
              alt={album.name}
              className="h-36 w-36 rounded-xl object-cover shadow-lg sm:h-44 sm:w-44"
              width={144}
              height={144}
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-muted sm:h-44 sm:w-44">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">album</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {album.album_type === "single" ? "Single" : "Album"}
          </p>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{album.name}</h1>

          <Link
            href={`/artists/${mainArtist.id}`}
            className="mt-1 block text-base font-medium text-primary transition-colors hover:text-primary/80"
          >
            {mainArtist.name}
          </Link>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {year && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                {year}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">music_note</span>
              {album.total_tracks} titre{album.total_tracks > 1 ? "s" : ""}
            </span>
            {album.label && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">label</span>
                {album.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Community rating */}
      {stats && stats.review_count > 0 && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-amber-400">{avgStars!.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">/ 5</span>
          </div>
          <div className="flex flex-col gap-1">
            <StarRating value={avgStars!} size="md" />
            <p className="text-sm text-muted-foreground">
              Note moyenne · {stats.review_count} avis
            </p>
          </div>
        </div>
      )}

      {/* Spotify link */}
      {album.external_urls?.spotify && (
        <a
          href={album.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#1DB954]/10 px-4 py-3 text-sm font-medium text-[#1DB954] transition-colors hover:bg-[#1DB954]/20"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Écouter sur Spotify
        </a>
      )}

      {/* User review section */}
      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Ma review</h2>

        {userReview ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            {isEditing ? (
              <>
                <div className="mb-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="text-sm font-medium">Ta note</label>
                    <span className="text-sm font-semibold text-amber-400">
                      {editRating > 0 ? `${editRating} / 5` : "—"}
                    </span>
                  </div>
                  <StarRating value={editRating} onChange={setEditRating} size="lg" />
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium">
                    Impression <span className="text-muted-foreground">(optionnel)</span>
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

                {editError && <p className="mb-4 text-sm text-red-500">{editError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isUpdating ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <StarRating value={starsFromDb(userReview.rating)} size="sm" />
                    <span className="font-semibold text-amber-400">
                      {starsFromDb(userReview.rating)} / 5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Modifier
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      {isDeleting ? "..." : "Supprimer"}
                    </button>
                  </div>
                </div>

                {userReview.review ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{userReview.review}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Aucune impression ajoutée</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-10 text-center">
            <span className="material-symbols-outlined mb-2 text-4xl text-muted-foreground">
              rate_review
            </span>
            <p className="text-sm text-muted-foreground">Tu n&apos;as pas encore reviewé cet album</p>
            <Link
              href="/biblio/albums"
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ajouter une review
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
