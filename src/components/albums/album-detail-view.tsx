"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { StarRating } from "@/components/ui/star-rating";
import { updateAlbumReview, deleteAlbumReview } from "@/lib/actions/albums";
import type { CatalogAlbumDetails, AlbumReview, AlbumCommunityStats, CatalogAlbumTrack, FavoriteTrack } from "@/types";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/ui/cover";
import { AddTracksToLibraryButton, FavoriteTrackPicker, toFavoriteTracks } from "./favorite-track-picker";
import { useNextSteps } from "@/components/next-steps/next-steps-provider";
import { Plus } from "lucide-react";
import { ListenLink } from "@/components/ui/listen-link";

interface Props {
  album: CatalogAlbumDetails;
  stats: AlbumCommunityStats | null;
  userReview: AlbumReview | null;
  /** Wikipedia et Wikidata, rendus cote serveur en streaming. */
  encyclopedia?: React.ReactNode;
}

function starsFromDb(dbRating: number) {
  return dbRating / 2;
}

export function AlbumDetailView({ album, stats, userReview: initialReview, encyclopedia }: Props) {
  const t = useTranslations("albums.detail");
  const tr = useTranslations("albums.review");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const stars = (value: number) => value.toLocaleString(intlLocale, { maximumFractionDigits: 1 });
  const router = useRouter();
  const nextSteps = useNextSteps();
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
      setEditError(result.error || tc("genericError"));
    }
    setIsUpdating(false);
  };

  const [favoriteError, setFavoriteError] = useState("");
  // Les preferes tels qu'enregistres, et la file des enregistrements : on
  // envoie la liste entiere a chaque coeur, l'un apres l'autre, pour que
  // le dernier touche gagne meme si l'on touche vite.
  const savedFavorites = useRef<FavoriteTrack[]>(initialReview?.favorite_tracks ?? []);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const lastSave = useRef(0);

  // Chaque coeur s'enregistre tout de suite : pas de mode edition.
  const handleFavorites = (picked: CatalogAlbumTrack[]) => {
    if (!userReview) return;
    const reviewId = userReview.id;
    const favorites = toFavoriteTracks(picked);
    const save = ++lastSave.current;
    setUserReview({ ...userReview, favorite_tracks: favorites });
    setFavoriteError("");

    saveQueue.current = saveQueue.current.then(async () => {
      const result = await updateAlbumReview(reviewId, { favorite_tracks: favorites });
      if (result.success) {
        savedFavorites.current = favorites;
      } else if (save === lastSave.current) {
        // Si un coeur plus recent attend derriere, c'est lui qui tranchera.
        const saved = savedFavorites.current;
        setUserReview((review) => (review ? { ...review, favorite_tracks: saved } : review));
        setFavoriteError(result.error || t("favoriteFailed"));
      }
    });
  };

  const favorites = userReview?.favorite_tracks ?? [];

  const tracks = album.tracks?.items ?? [];

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
    <div className="mx-auto max-w-2xl">
      {/* Retour */}
      <button
        onClick={() => router.back()}
        className="-ml-1 mb-4 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
        {t("back")}
      </button>

      {/* Album header */}
      {/* En-tete, style Etagere : la pochette avec son lisere, le titre en gras serre */}
      <div className="flex items-end gap-5 sm:gap-7">
        <Cover src={album.images[0]?.url} alt={album.name} className="h-36 w-36 rounded-md sm:h-44 sm:w-44" priority />

        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {album.record_type === "single" ? t("single") : album.record_type === "ep" ? t("ep") : t("album")}
          </p>
          <h1 className="text-balance text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-4xl">{album.name}</h1>

          <Link
            href={`/artists/${mainArtist.id}`}
            className="mt-1 block text-base font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {mainArtist.name}
          </Link>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {year && (
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" className="h-[15px] w-[15px]" />
                {year}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="music_note" className="h-[15px] w-[15px]" />
              {t("tracks", { count: album.total_tracks })}
            </span>
            {album.label && (
              <span className="flex items-center gap-1">
                <Icon name="label" className="h-[15px] w-[15px]" />
                {album.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Community rating */}
      {stats && stats.review_count > 0 && (
        <div className="mt-6 flex items-center gap-4 border-y border-border py-4">
          <p className="tabular font-display text-5xl font-extrabold leading-none">
            {avgStars!.toLocaleString(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="text-lg text-muted-foreground">/5</span>
          </p>
          <div className="flex flex-col gap-1">
            <StarRating value={avgStars!} size="md" />
            <p className="text-sm text-muted-foreground">
              {t("average", { count: stats.review_count })}
            </p>
          </div>
        </div>
      )}

      {/* Lien d'ecoute */}
      <ListenLink href={album.url} className="mt-4" />

      {/* User review section */}
      <div className="mt-6">
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("myReview")}</h2>

        {userReview ? (
          <div className="py-3">
            {isEditing ? (
              <>
                <div className="mb-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="text-sm font-medium">{tr("yourRating")}</label>
                    <span className="tabular font-display text-lg font-bold">
                      {editRating > 0 ? tr("ratingValue", { rating: stars(editRating) }) : "—"}
                    </span>
                  </div>
                  <StarRating value={editRating} onChange={setEditRating} size="lg" />
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium">
                    {t("impression")} <span className="text-muted-foreground">{tr("optional")}</span>
                  </label>
                  <textarea
                    value={editReview}
                    onChange={(e) => setEditReview(e.target.value)}
                    placeholder={tr("placeholder")}
                    rows={4}
                    maxLength={2000}
                    className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {editReview.length}/2000
                  </p>
                </div>

                {editError && <p className="mb-4 text-sm text-destructive">{editError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isUpdating ? tc("saving") : tc("save")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <StarRating value={starsFromDb(userReview.rating)} size="sm" />
                    <span className="tabular font-display text-xl font-bold">
                      {tr("ratingValue", { rating: stars(starsFromDb(userReview.rating)) })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
                    >
                      <Icon name="edit" className="h-[15px] w-[15px]" />
                      {tc("edit")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <Icon name="delete" className="h-[15px] w-[15px]" />
                      {isDeleting ? "..." : tc("delete")}
                    </button>
                  </div>
                </div>

                {userReview.review ? (
                  <p className="whitespace-pre-wrap font-serif text-[15px] italic leading-relaxed">{userReview.review}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">{tr("none")}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 py-5">
            <p className="text-sm text-muted-foreground">{t("notRated")}</p>
            <Link
              href="/biblio/albums"
              className="inline-flex min-h-[40px] items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("addReview")}
            </Link>
          </div>
        )}
      </div>

      {encyclopedia}

      {/* Titres : le coeur marque le morceau prefere */}
      {tracks.length > 0 && (
        <div className="mt-8">
          <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
            <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("tracksTitle")}
            </h2>
            <div className="flex items-baseline gap-3">
              {userReview && (
                <span className="hidden text-xs text-muted-foreground sm:inline">{t("tapFavorite")}</span>
              )}
              {/* N'importe quels titres vers la biblio, les preferes coches d'emblee. */}
              <button
                type="button"
                onClick={() =>
                  nextSteps.show({
                    kind: "album_tracks",
                    album: {
                      name: album.name,
                      artist: mainArtist.name,
                      coverUrl: album.images[0]?.url,
                      deezerId: album.id,
                    },
                    tracks,
                    preselected: favorites.flatMap((track) => (track.deezer_id ? [track.deezer_id] : [])),
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                {t("learnTracks")}
              </button>
            </div>
          </div>

          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="min-w-0 text-sm">
                <span className="text-muted-foreground">{t("yourFavorite", { count: favorites.length })}</span>
                <span className="font-semibold">{favorites.map((track) => track.name).join(", ")}</span>
              </p>
              <AddTracksToLibraryButton
                key={favorites.map((track) => track.deezer_id ?? track.name).join("|")}
                tracks={favorites}
                artist={mainArtist.name}
                album={album.name}
                coverUrl={album.images[0]?.url}
              />
            </div>
          )}

          {favoriteError && <p className="py-2 text-sm text-destructive">{favoriteError}</p>}

          {userReview ? (
            <FavoriteTrackPicker
              tracks={tracks}
              value={favorites.flatMap((track) => (track.deezer_id ? [track.deezer_id] : []))}
              onChange={handleFavorites}
            />
          ) : (
            <ol className="divide-y divide-border border-b border-border">
              {tracks.map((track) => (
                <li key={track.id} className="grid min-h-[44px] grid-cols-[28px_minmax(0,1fr)] items-center gap-2 py-2">
                  <span className="tabular text-right font-mono text-xs text-muted-foreground">{track.track_number}</span>
                  <span className="truncate text-sm">{track.name}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
