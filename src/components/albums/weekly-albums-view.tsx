"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getWeeklyAlbums } from "@/lib/actions/albums";
import { StarRating } from "@/components/ui/star-rating";
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
    <div>
      {/* Semaine */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToWeek(week.week_offset + 1)}
          disabled={isPending}
          aria-label="Semaine précédente"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            chevron_left
          </span>
        </button>

        <div className={`text-center transition-opacity ${isPending ? "opacity-50" : ""}`}>
          <p className="font-semibold">{weekTitle(week.week_offset)}</p>
          <p className="text-sm text-muted-foreground">
            du {formatDay(week.week_start)} au {formatDay(week.week_end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => goToWeek(week.week_offset - 1)}
          disabled={isPending || week.week_offset === 0}
          aria-label="Semaine suivante"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            chevron_right
          </span>
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
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
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
        <ol className={`flex flex-col gap-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
          {albums.map((album, index) => (
            <li key={album.key}>
              <WeeklyAlbumRow album={album} rank={index + 1} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function WeeklyAlbumRow({ album, rank }: { album: WeeklyAlbum; rank: number }) {
  const content = (
    <>
      <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
        {rank}
      </span>

      {album.cover_url ? (
        <img
          src={album.cover_url}
          alt={album.album_name}
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <span className="material-symbols-outlined text-2xl text-muted-foreground">album</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{album.album_name}</p>
        <p className="truncate text-sm text-muted-foreground">{album.artist_name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {album.review_count} écoute{album.review_count > 1 ? "s" : ""}
          {album.user_rating !== null && <> · ta note {formatStars(album.user_rating)}</>}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 text-sm font-bold">
          <span className="material-symbols-outlined text-[14px] text-primary">star</span>
          {formatStars(album.avg_rating)}
        </span>
        <div className="hidden sm:block">
          <StarRating value={Math.round(album.avg_rating) / 2} size="sm" />
        </div>
      </div>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors";

  return album.spotify_id ? (
    <Link href={`/albums/${album.spotify_id}`} className={`${className} hover:border-primary/40`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
