"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, Check, Play } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { addToAlbumWishlist } from "@/lib/actions/album-wishlist";
import type { ArtistLibraryContext } from "@/lib/actions/albums";
import type { AlbumCommunityStats, SongStatus, CatalogAlbum } from "@/types";

interface Props {
  artistName: string;
  albums: CatalogAlbum[];
  communityStats: Record<string, AlbumCommunityStats>;
  library: ArtistLibraryContext;
}

const STATUS_LABELS: Record<SongStatus, string> = {
  want_to_learn: "À apprendre",
  learning: "En cours",
  mastered: "Maîtrisé",
};

/** Le nom d'un album, sans « (Remastered) » ni « - Deluxe » : pour comparer. */
export function albumKey(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\s*[([].*?[)\]]\s*/g, " ")
    .replace(/\s+-\s+.*$/, "")
    .trim();
}

/**
 * « Toi et AC/DC » : ce qu'on joue de l'artiste, et l'album a ecouter
 * ensuite.
 *
 * L'album propose est choisi dans cet ordre : un album qui contient un
 * morceau qu'on travaille (on l'a deja dans les doigts, pas encore dans
 * les oreilles), puis le mieux note par la communaute, puis le premier de
 * la discographie. Jamais un album deja ecoute ou deja mis de cote.
 */
export function ArtistLibrarySection({ artistName, albums, communityStats, library }: Props) {
  const { songs, reviewed, wishlisted } = library;
  const listenedCount = Object.keys(reviewed).length;

  const candidates = albums.filter((album) => !(album.id in reviewed) && !wishlisted.includes(album.id));
  const songAlbums = new Set(songs.map((song) => albumKey(song.album)).filter(Boolean));
  const suggestion =
    candidates.find((album) => songAlbums.has(albumKey(album.name))) ??
    [...candidates]
      .filter((album) => (communityStats[album.id]?.review_count ?? 0) > 0)
      .sort((a, b) => communityStats[b.id].avg_rating - communityStats[a.id].avg_rating)[0] ??
    candidates[0];

  if (songs.length === 0 && listenedCount === 0 && !suggestion) return null;

  const mastered = songs.filter((song) => song.status === "mastered").length;
  const summary = [
    songs.length > 0 && `${songs.length} morceau${songs.length > 1 ? "x" : ""} dans ta biblio`,
    mastered > 0 && `${mastered} maîtrisé${mastered > 1 ? "s" : ""}`,
    listenedCount > 0 && `${listenedCount} album${listenedCount > 1 ? "s" : ""} écouté${listenedCount > 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <section className="mb-8">
      <h2 className="mb-1 border-b border-border pb-2 text-lg font-extrabold tracking-[-0.01em]">
        Toi et {artistName}
      </h2>
      {summary.length > 0 && <p className="py-2 text-sm text-muted-foreground">{summary.join(" · ")}</p>}

      {songs.length > 0 && (
        <ul className="divide-y divide-border">
          {songs.slice(0, 6).map((song) => (
            <li key={song.id} className="flex min-h-[52px] items-center gap-3 py-2">
              <Cover src={song.cover_url} className="h-10 w-10 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {STATUS_LABELS[song.status]}
                  {song.album && <> · {song.album}</>}
                </p>
              </div>
              {song.status === "mastered" ? (
                <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={2.25} aria-label="Maîtrisé" />
              ) : (
                <Link
                  href={`/jouer?song=${song.id}`}
                  aria-label={`Jouer ${song.title}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent"
                >
                  <Play className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {songs.length > 6 && (
        <Link href="/biblio" className="mt-1 inline-block text-xs font-semibold text-muted-foreground hover:text-foreground">
          Voir les {songs.length} dans ta biblio
        </Link>
      )}

      {suggestion && (
        <AlbumSuggestion
          album={suggestion}
          reason={
            songAlbums.has(albumKey(suggestion.name))
              ? "Tu en joues déjà un titre : écoute tout l'album"
              : songs.length > 0
                ? `Tu joues ${artistName}, mais as-tu écouté celui-là ?`
                : "Par où commencer"
          }
        />
      )}
    </section>
  );
}

function AlbumSuggestion({ album, reason }: { album: CatalogAlbum; reason: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await addToAlbumWishlist({
        album_name: album.name,
        artist_name: album.artists.map((artist) => artist.name).join(", "),
        cover_url: album.images[0]?.url,
        deezer_id: album.id,
        release_date: album.release_date,
        total_tracks: album.total_tracks,
      });
      // « Deja dans ta wishlist » est un etat, pas un echec.
      if (result.success || result.error) setSaved(true);
    });
  };

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
      <Link href={`/albums/${album.id}`} className="shrink-0">
        <Cover src={album.images[0]?.url} className="h-16 w-16 rounded-md" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{reason}</p>
        <Link href={`/albums/${album.id}`} className="block truncate font-display text-xl font-extrabold uppercase leading-tight hover:underline">
          {album.name}
        </Link>
        {saved ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.25} aria-hidden="true" />
            Dans ta liste « À écouter »
          </p>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="mt-1.5 inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold hover:bg-accent disabled:opacity-50"
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {pending ? "Ajout…" : "À écouter"}
          </button>
        )}
      </div>
    </div>
  );
}
