"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cover } from "@/components/ui/cover";
import { Icon } from "@/components/ui/icon";
import { bandSongHref, formatMusicalKey } from "@/lib/band-songs";
import type { BandSongListItem } from "@/types";

/** Une ligne du repertoire : le morceau, sa tonalite et son tempo. */
export function BandSongRow({ bandId, song }: { bandId: string; song: BandSongListItem }) {
  const t = useTranslations("repertoire");
  const details = [
    formatMusicalKey(song.key_note, song.key_mode, t),
    song.bpm ? t("bpm", { bpm: song.bpm }) : null,
  ].filter(Boolean);

  return (
    <li className="border-b border-border">
      <Link
        href={bandSongHref(bandId, song.id)}
        className="flex min-h-[60px] items-center gap-3 py-2 transition-colors hover:bg-accent/40"
      >
        <Cover src={song.cover_url} className="h-10 w-10 rounded-[3px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{song.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {[song.artist, ...details].filter(Boolean).join(" · ")}
          </span>
        </span>
        <Icon name="chevron_right" className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
