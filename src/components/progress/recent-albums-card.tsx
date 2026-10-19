"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { CommonT } from "@/i18n/types";
import { EmptyState } from "@/components/ui/empty-state";
import type { AlbumReview } from "@/types";
import { Icon } from "@/components/ui/icon";

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

function formatWhen(date: string, t: CommonT, intlLocale: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return t("relative.today");
  if (days === 1) return t("relative.yesterday");
  if (days < 7) return t("relative.daysAgoShort", { count: days });
  if (days < 31) return t("relative.weeksAgoShort", { count: Math.floor(days / 7) });
  return new Date(date).toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
  });
}

export function RecentAlbumsCard({ albums }: RecentAlbumsCardProps) {
  const t = useTranslations("progress.recentAlbums");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  if (albums.length === 0) {
    return (
      <section aria-labelledby="recent-albums">
        <h2
          id="recent-albums"
          className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <EmptyState
          compact
          icon="album"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actions={[
            { label: t("rate"), icon: "add", primary: true, href: "/biblio/albums" },
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
          className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <Link
          href="/biblio/albums"
          className="shrink-0 text-xs font-semibold text-foreground underline-offset-2 hover:underline"
        >
          {tc("seeAll")}
        </Link>
      </div>

      <ul className="flex flex-col border-t border-border">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/biblio/albums?q=${encodeURIComponent(album.album_name)}`}
              className="flex min-h-[56px] items-center gap-3 border-b border-border py-1.5 transition-colors hover:bg-accent/50"
            >
              {album.cover_url ? (
                <Image
                  src={album.cover_url}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-[3px] object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-secondary text-muted-foreground">
                  <Icon name="album" className="h-[20px] w-[20px]" />
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
                  {(album.rating / 2).toLocaleString(intlLocale)}
                  <span className="font-normal text-muted-foreground">/5</span>
                </span>
                {formatWhen(album.created_at, tc, intlLocale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
