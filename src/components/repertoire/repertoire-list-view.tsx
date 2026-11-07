"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { rehearsalSongKey } from "@/lib/rehearsal-log";
import { AddBandSongModal } from "./add-band-song-modal";
import { BandSongRow } from "./band-song-row";
import type { BandSongListItem } from "@/types";

interface RepertoireListViewProps {
  bandId: string;
  bandName: string;
  songs: BandSongListItem[];
  readOnly: boolean;
}

/** Le repertoire complet : un filtre sur le titre et l'artiste, sans accents. */
export function RepertoireListView({ bandId, bandName, songs, readOnly }: RepertoireListViewProps) {
  const t = useTranslations("repertoire");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const shown = useMemo(() => {
    const needle = rehearsalSongKey(query, "").replace(/\|$/, "");
    if (!needle) return songs;
    return songs.filter((song) => rehearsalSongKey(song.title, song.artist).includes(needle));
  }, [query, songs]);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href={`/commu/groupes/${bandId}`}
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          {bandName}
        </Link>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.88]">{t("title")}</h1>
          {!readOnly && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent"
            >
              <Icon name="add" className="h-4 w-4" />
              {t("add")}
            </button>
          )}
        </div>
        {readOnly && <p className="mt-2 text-sm text-muted-foreground">{t("readOnly")}</p>}
      </div>

      {songs.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("filter")}
          aria-label={t("filter")}
          className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
        />
      )}

      {songs.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t("noMatch")}</p>
      ) : (
        <ul className="border-t border-border">
          {shown.map((song) => (
            <BandSongRow key={song.id} bandId={bandId} song={song} />
          ))}
        </ul>
      )}

      {adding && <AddBandSongModal bandId={bandId} onClose={() => setAdding(false)} />}
    </div>
  );
}
