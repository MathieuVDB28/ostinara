"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Heart, Plus } from "lucide-react";
import { addAlbumTrackToLibrary } from "@/lib/actions/albums";
import type { CatalogAlbumTrack } from "@/types";

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface FavoriteTrackPickerProps {
  tracks: CatalogAlbumTrack[];
  /** Identifiant Deezer du titre prefere, ou null. */
  value: string | null;
  onChange: (track: CatalogAlbumTrack | null) => void;
  disabled?: boolean;
  /** Hauteur bornee dans une modale, liste entiere sur la page de l'album. */
  scroll?: boolean;
}

/**
 * La tracklist, ou l'on marque son morceau prefere d'un coeur.
 *
 * Un seul choix, et on peut le retirer en touchant de nouveau le meme
 * titre : un radio qu'on ne peut pas decocher obligerait a garder un
 * prefere qu'on ne veut plus.
 */
export function FavoriteTrackPicker({ tracks, value, onChange, disabled, scroll }: FavoriteTrackPickerProps) {
  const t = useTranslations("albums.tracks");
  const multiDisc = tracks.some((track) => track.disc_number > 1);

  return (
    <ol
      aria-label={t("aria")}
      className={`divide-y divide-border border-y border-border ${scroll ? "max-h-64 overflow-y-auto" : ""}`}
    >
      {tracks.map((track) => {
        const selected = track.id === value;
        return (
          <li key={track.id}>
            <button
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? null : track)}
              className={`grid min-h-[44px] w-full grid-cols-[28px_minmax(0,1fr)_auto_24px] items-center gap-2 py-2 text-left transition-colors hover:bg-accent/50 disabled:opacity-60 ${
                selected ? "font-semibold" : ""
              }`}
            >
              <span className="tabular text-right font-mono text-xs text-muted-foreground">
                {multiDisc ? `${track.disc_number}.${track.track_number}` : track.track_number}
              </span>
              <span className="truncate text-sm">{track.name}</span>
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

interface AddTrackToLibraryButtonProps {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  deezerId?: string;
}

/**
 * « Ajouter à ma biblio » : le morceau prefere rejoint la file « à
 * apprendre ». Un morceau deja dans la biblio n'est pas duplique, le
 * bouton le dit et mene a la bibliotheque.
 */
export function AddTrackToLibraryButton({ title, artist, album, coverUrl, deezerId }: AddTrackToLibraryButtonProps) {
  const t = useTranslations("albums.tracks");
  const tc = useTranslations("common");
  const [state, setState] = useState<"idle" | "added" | "already">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await addAlbumTrackToLibrary({
        title,
        artist,
        album,
        cover_url: coverUrl,
        deezer_id: deezerId,
      });
      if (result.success) {
        setState(result.alreadyThere ? "already" : "added");
      } else {
        setError(result.error || t("addFailed"));
      }
    });
  };

  if (state !== "idle") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
        <span>{state === "added" ? t("added") : t("already")}</span>
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
        {pending ? tc("adding") : t("add")}
      </button>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
