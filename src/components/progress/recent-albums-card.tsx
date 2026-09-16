"use client";

import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import type { AlbumReview } from "@/types";

/**
 * Les derniers albums ecoutes.
 *
 * Ils viennent des albums notes : dans Ostinara, noter un album, c'est
 * l'avoir ecoute. La note est stockee sur 10 en base et s'affiche sur 5 —
 * c'est la meme convention que partout ailleurs dans l'app.
 */

interface RecentAlbumsCardProps {
  albums: AlbumReview[];
}

function formatWhen(date: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 31) return `il y a ${Math.floor(days / 7)} sem.`;
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function RecentAlbumsCard({ albums }: RecentAlbumsCardProps) {
  if (albums.length === 0) {
    return (
      <section aria-labelledby="recent-albums">
        <h2
          id="recent-albums"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Derniers albums écoutés
        </h2>
        <EmptyState
          compact
          icon="album"
          title="Aucun album noté"
          description="Note un album que tu viens d'écouter : il apparaîtra ici, et dans ta bibliothèque."
          actions={[
            { label: "Noter un album", icon: "add", primary: true, href: "/biblio/albums" },
          ]}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-albums">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2
          id="recent-albums"
          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Derniers albums écoutés
        </h2>
        <Link
          href="/biblio/albums"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Tout voir
        </Link>
      </div>

      <ul className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-2">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/biblio/albums?q=${encodeURIComponent(album.album_name)}`}
              className="flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-accent"
            >
              {album.cover_url ? (
                <Image
                  src={album.cover_url}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                    album
                  </span>
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {album.album_name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {album.artist_name}
                </span>
              </span>

              <span className="tabular shrink-0 text-right text-xs text-muted-foreground">
                <span className="block font-semibold text-foreground">
                  {album.rating / 2}
                  <span className="font-normal text-muted-foreground">/5</span>
                </span>
                {formatWhen(album.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
