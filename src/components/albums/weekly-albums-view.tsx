"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getWeeklyAlbums } from "@/lib/actions/albums";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/empty-state";
import type { WeeklyAlbum, WeeklyAlbums } from "@/types";

interface WeeklyAlbumsViewProps {
  initial: WeeklyAlbums;
  /** Recherche Biblio, quand la vue est affichee dans « Biblio › Albums ». */
  query?: string;
}

type SortMode = "top" | "popular";

// rating is stored as 0–10 integer (db value = stars × 2)
function formatStars(dbRating: number) {
  return (dbRating / 2).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function weekTitle(offset: number) {
  if (offset === 0) return "Cette semaine";
  if (offset === 1) return "La semaine dernière";
  return `Il y a ${offset} semaines`;
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Les albums de la semaine : tout ce que la communaute a ecoute du lundi
 * au dimanche, classe par note moyenne. Meme vue dans « Commu › Albums »
 * et dans l'onglet « Semaine » de « Biblio › Albums ».
 */
export function WeeklyAlbumsView({ initial, query = "" }: WeeklyAlbumsViewProps) {
  const [week, setWeek] = useState(initial);
  const [sort, setSort] = useState<SortMode>("top");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const goToWeek = (offset: number) => {
    setError(null);
    startTransition(async () => {
      const next = await getWeeklyAlbums(offset);
      if (next) {
        setWeek(next);
      } else {
        setError("Impossible de charger cette semaine");
      }
    });
  };

  const search = normalize(query.trim());
  const albums = week.albums
    .filter(
      (album) =>
        !search ||
        normalize(album.album_name).includes(search) ||
        normalize(album.artist_name).includes(search)
    )
    .sort((a, b) =>
      sort === "popular"
        ? b.review_count - a.review_count || b.avg_rating - a.avg_rating
        : b.avg_rating - a.avg_rating || b.review_count - a.review_count
    );

  return (
    <div className="max-w-2xl">
      {/* Semaine */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToWeek(week.week_offset + 1)}
          disabled={isPending}
          aria-label="Semaine précédente"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className={`text-center transition-opacity ${isPending ? "opacity-50" : ""}`}>
          <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[0.02em]">
            {weekTitle(week.week_offset)}
          </p>
          <p className="text-sm text-muted-foreground">
            du {formatDay(week.week_start)} au {formatDay(week.week_end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => goToWeek(week.week_offset - 1)}
          disabled={isPending || week.week_offset === 0}
          aria-label="Semaine suivante"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>

      {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

      {/* Tri */}
      {week.albums.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["top", "Mieux notés"],
              ["popular", "Plus écoutés"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              aria-pressed={sort === mode}
              className={`inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold transition-colors ${
                sort === mode ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {week.albums.length === 0 ? (
        <EmptyState
          compact
          icon="album"
          title="Aucune écoute cette semaine"
          description="Chaque album noté par un membre d'Ostinara entre lundi et dimanche apparaît ici, classé par note moyenne."
          actions={[
            { label: "Noter un album", icon: "add", href: "/biblio/albums", primary: true },
          ]}
        />
      ) : albums.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun album de la semaine ne correspond à ta recherche
        </p>
      ) : (
        <ol className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
          {albums.map((album, index) => (
            <li key={album.key}>
              {index === 0 ? (
                <WeeklyTopAlbum album={album} />
              ) : (
                <WeeklyAlbumRow album={album} rank={index + 1} />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Le n° 1 de la semaine en affiche (style Fanzine, docs/refonte-ui.md) :
 * la pochette plein cadre, le titre en capitales condensees posees dessus.
 */
function WeeklyTopAlbum({ album }: { album: WeeklyAlbum }) {
  const poster = (
    <Cover src={album.cover_url} alt="" className="aspect-[16/10] w-full sm:rounded-md">
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-black/85" />
      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-display text-[13px] font-bold text-white">
        <Star className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
        {formatStars(album.avg_rating)}
      </span>
      <span className="absolute inset-x-4 bottom-3.5 text-white">
        <span className="block font-display text-[11px] font-bold uppercase tracking-[0.08em] opacity-85">
          N° 1 de la semaine
        </span>
        <span className="block text-balance font-display text-[40px] font-extrabold uppercase leading-[0.9] sm:text-5xl">
          {album.album_name}
        </span>
        <span className="block font-display text-[13px] font-bold uppercase tracking-[0.06em] opacity-85">
          {album.artist_name} · {album.review_count} écoute{album.review_count > 1 ? "s" : ""}
          {album.user_rating !== null && <> · ta note {formatStars(album.user_rating)}</>}
        </span>
      </span>
    </Cover>
  );

  return (
    <div className="-mx-4 mb-1 sm:mx-0">
      {album.spotify_id ? (
        <Link href={`/albums/${album.spotify_id}`} className="block">
          {poster}
        </Link>
      ) : (
        poster
      )}
    </div>
  );
}

function WeeklyAlbumRow({ album, rank }: { album: WeeklyAlbum; rank: number }) {
  const content = (
    <>
      <span className="tabular w-8 shrink-0 text-center font-display text-3xl font-extrabold leading-none text-muted-foreground">
        {rank}
      </span>

      <Cover src={album.cover_url} alt="" className="h-14 w-14 rounded-[3px]" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-extrabold uppercase leading-tight">{album.album_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {album.artist_name} · {album.review_count} écoute{album.review_count > 1 ? "s" : ""}
          {album.user_rating !== null && <> · ta note {formatStars(album.user_rating)}</>}
        </p>
      </div>

      <span className="tabular shrink-0 font-display text-xl font-bold text-primary">
        {formatStars(album.avg_rating)}
        <span className="sr-only"> sur 5</span>
      </span>
    </>
  );

  const className = "flex items-center gap-3 border-b border-border py-2.5 transition-colors";

  return album.spotify_id ? (
    <Link href={`/albums/${album.spotify_id}`} className={`${className} hover:bg-accent/50`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
