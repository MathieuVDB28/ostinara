"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import type { Song } from "@/types";
import { Icon } from "@/components/ui/icon";

/**
 * Les derniers morceaux ajoutes a la bibliotheque.
 *
 * `getSongs()` trie deja par date d'ajout decroissante : on prend la tete
 * de la liste, sans requete de plus. Chaque ligne ouvre la fiche du
 * morceau grace au lien profond `?song=`.
 */

interface RecentSongsCardProps {
  songs: Song[];
}

export function RecentSongsCard({ songs }: RecentSongsCardProps) {
  const t = useTranslations("progress.recentSongs");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  if (songs.length === 0) {
    return (
      <section aria-labelledby="recent-songs">
        <h2
          id="recent-songs"
          className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <EmptyState
          compact
          icon="music_note"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actions={[
            { label: t("add"), icon: "add", primary: true, href: "/biblio" },
          ]}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-songs">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2
          id="recent-songs"
          className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <Link
          href="/biblio"
          className="shrink-0 text-xs font-semibold text-foreground underline-offset-2 hover:underline"
        >
          {tc("seeAll")}
        </Link>
      </div>

      <ul className="flex flex-col border-t border-border">
        {songs.map((song) => (
          <li key={song.id}>
            <Link
              href={`/biblio?song=${song.id}`}
              className="flex min-h-[56px] items-center gap-3 border-b border-border py-1.5 transition-colors hover:bg-accent/50"
            >
              {song.cover_url ? (
                <Image
                  src={song.cover_url}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-[3px] object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-secondary text-muted-foreground">
                  <Icon name="music_note" className="h-[20px] w-[20px]" />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {song.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {song.artist}
                </span>
              </span>

              {/*
                Le statut en texte, pas en pastille de couleur : la colonne
                est etroite et une teinte seule ne dit rien a qui ne la
                distingue pas.
              */}
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                {te(`songStatus.${song.status}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
