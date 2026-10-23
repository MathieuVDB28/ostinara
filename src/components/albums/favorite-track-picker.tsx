"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Heart, Plus } from "lucide-react";
import { addSongsToLibrary } from "@/lib/actions/songs";
import type { CatalogAlbumTrack, FavoriteTrack } from "@/types";

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface FavoriteTrackPickerProps {
  tracks: CatalogAlbumTrack[];
  /** Identifiants Deezer des titres preferes. */
  value: string[];
  /** Les preferes apres le changement, dans l'ordre de l'album. */
  onChange: (tracks: CatalogAlbumTrack[]) => void;
  disabled?: boolean;
  /** Hauteur bornee dans une modale, liste entiere sur la page de l'album. */
  scroll?: boolean;
  /** Les amis qui ont mis un coeur, par identifiant Deezer du titre. */
  likedBy?: Record<string, string[]>;
}

/**
 * La tracklist, ou l'on marque ses morceaux preferes d'un coeur. Toucher
 * un titre l'ajoute ou le retire ; les preferes suivent l'ordre de l'album.
 */
export function FavoriteTrackPicker({ tracks, value, onChange, disabled, scroll, likedBy }: FavoriteTrackPickerProps) {
  const t = useTranslations("albums.tracks");
  const multiDisc = tracks.some((track) => track.disc_number > 1);
  const chosen = new Set(value);

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(tracks.filter((track) => next.has(track.id)));
  };

  return (
    <ol
      aria-label={t("aria")}
      className={`divide-y divide-border border-y border-border ${scroll ? "max-h-64 overflow-y-auto" : ""}`}
    >
      {tracks.map((track) => {
        const selected = chosen.has(track.id);
        return (
          <li key={track.id}>
            <button
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(track.id)}
              className={`grid min-h-[44px] w-full grid-cols-[28px_minmax(0,1fr)_auto_24px] items-center gap-2 py-2 text-left transition-colors hover:bg-accent/50 disabled:opacity-60 ${
                selected ? "font-semibold" : ""
              }`}
            >
              <span className="tabular text-right font-mono text-xs text-muted-foreground">
                {multiDisc ? `${track.disc_number}.${track.track_number}` : track.track_number}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{track.name}</span>
                <LikedBy names={likedBy?.[track.id]} />
              </span>
              <span className="tabular font-mono text-xs text-muted-foreground">
                {formatDuration(track.duration_ms)}
              </span>
              <Heart
                aria-hidden="true"
                className={`h-[18px] w-[18px] justify-self-end ${selected ? "fill-primary text-primary" : "text-muted-foreground/60"}`}
                strokeWidth={1.75}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** « ♡ Léa, Tom » sous un titre : les amis qui l'ont mis dans leurs preferes. */
export function LikedBy({ names }: { names?: string[] }) {
  const t = useTranslations("albums.tracks");
  if (!names || names.length === 0) return null;
  const label = t("likedBy", { names: names.join(", ") });
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs font-normal text-muted-foreground" title={label}>
      <Heart className="h-3 w-3 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="truncate">{names.join(", ")}</span>
    </span>
  );
}

/** Les preferes a enregistrer, a partir des titres choisis. */
export function toFavoriteTracks(tracks: CatalogAlbumTrack[]): FavoriteTrack[] {
  return tracks.map((track) => ({ name: track.name, deezer_id: track.id }));
}

/** Ce qui identifie un titre pour inLibrary : son identifiant Deezer, a defaut son nom. */
export function libraryKey(track: FavoriteTrack): string {
  return track.deezer_id ?? track.name;
}

interface AddTracksToLibraryButtonProps {
  tracks: FavoriteTrack[];
  artist: string;
  album?: string;
  coverUrl?: string;
  /** Les titres deja dans la biblio (cf. libraryKey) : on ne les propose pas. */
  inLibrary?: ReadonlySet<string>;
  /** Les titres envoyes a la biblio (cf. libraryKey). */
  onAdded?: (keys: string[]) => void;
}

/**
 * « Ajouter à ma biblio » : les morceaux preferes rejoignent la file « à
 * apprendre ». Ceux deja dans la biblio ne sont pas proposes ; s'il n'en
 * reste aucun, le bouton le dit et mene a la bibliotheque.
 */
export function AddTracksToLibraryButton({
  tracks: favorites,
  artist,
  album,
  coverUrl,
  inLibrary,
  onAdded,
}: AddTracksToLibraryButtonProps) {
  const t = useTranslations("albums.tracks");
  const tc = useTranslations("common");
  const [outcome, setOutcome] = useState<{ added: number; alreadyThere: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tracks = favorites.filter((track) => !inLibrary?.has(libraryKey(track)));

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await addSongsToLibrary(
        tracks.map((track) => ({
          title: track.name,
          artist,
          album,
          cover_url: coverUrl,
          deezer_id: track.deezer_id,
        })),
        album ? { from: "album", label: album } : undefined
      );
      setOutcome({ added: result.added, alreadyThere: result.alreadyThere });
      if (!result.success || result.error) setError(result.error || t("addFailed"));
      else onAdded?.(tracks.map(libraryKey));
    });
  };

  if (!outcome && tracks.length === 0) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
        <span>{t("already", { count: favorites.length })}</span>
        <Link href="/biblio" className="font-semibold text-foreground underline-offset-2 hover:underline">
          {t("see")}
        </Link>
      </p>
    );
  }

  if (outcome && !error) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
        <span>
          {outcome.added > 0 ? t("added", { count: outcome.added }) : t("already", { count: outcome.alreadyThere })}
        </span>
        <Link href="/biblio" className="font-semibold underline-offset-2 hover:underline">
          {t("see")}
        </Link>
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        {pending ? tc("adding") : t("add", { count: tracks.length })}
      </button>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {outcome && outcome.added > 0 && t("partial", { count: outcome.added })}
          {error}
        </p>
      )}
    </div>
  );
}
