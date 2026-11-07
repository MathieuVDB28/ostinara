"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { AddBandSongModal } from "./add-band-song-modal";
import { BandSongRow } from "./band-song-row";
import type { BandSongListItem } from "@/types";

/** Combien de morceaux la page du groupe montre avant « Tout voir ». */
const PREVIEW = 6;

const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

interface BandRepertoireSectionProps {
  bandId: string;
  songs: BandSongListItem[];
  readOnly: boolean;
}

/** Le repertoire sur la page du groupe : les premiers morceaux, et de quoi en ajouter. */
export function BandRepertoireSection({ bandId, songs, readOnly }: BandRepertoireSectionProps) {
  const t = useTranslations("repertoire");
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 className={SECTION_TITLE}>
          {t("title")}
          {songs.length > 0 && <span className="tabular"> · {songs.length}</span>}
        </h2>
        {!readOnly && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <Icon name="add" className="h-3.5 w-3.5" strokeWidth={2} />
            {t("add")}
          </button>
        )}
      </div>

      {songs.length > 0 ? (
        <ul>
          {songs.slice(0, PREVIEW).map((song) => (
            <BandSongRow key={song.id} bandId={bandId} song={song} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {songs.length > PREVIEW && (
        <Link
          href={`/commu/groupes/${bandId}/repertoire`}
          className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold hover:underline"
        >
          {t("seeAll", { count: songs.length })}
          <Icon name="chevron_right" className="h-4 w-4" />
        </Link>
      )}

      {adding && <AddBandSongModal bandId={bandId} onClose={() => setAdding(false)} />}
    </section>
  );
}
