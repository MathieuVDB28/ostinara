"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { bandSongHref, formatMusicalKey } from "@/lib/band-songs";
import type { SetlistItemWithSongOwner } from "@/types";

interface JamSongSheetProps {
  item: SetlistItemWithSongOwner | null;
  /** Le groupe de la jam : de quoi ouvrir la fiche ; absent en session guidee. */
  bandId?: string | null;
}

/**
 * Ce que la fiche du repertoire dit du morceau en cours : la tonalite, et la
 * note de mon poste. Rien quand la fiche n'en dit rien.
 */
export function JamSongSheet({ item, bandId }: JamSongSheetProps) {
  const t = useTranslations("repertoire.jam");
  const tr = useTranslations("repertoire");
  const fiche = item?.item_type === "song" ? item.band_song : null;
  if (!fiche) return null;

  const musicalKey = formatMusicalKey(fiche.key_note, fiche.key_mode, tr);
  if (!musicalKey && !fiche.my_note && !bandId) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {musicalKey ? (
          <p>
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("key")}
            </span>{" "}
            <span className="font-semibold">{musicalKey}</span>
          </p>
        ) : (
          <span />
        )}
        {bandId && item?.band_song_id && (
          <Link
            href={bandSongHref(bandId, item.band_song_id)}
            target="_blank"
            className="text-xs font-semibold underline-offset-2 hover:underline"
          >
            {t("fiche")}
          </Link>
        )}
      </div>
      {fiche.my_note && (
        <div className="mt-2">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("myNote")}
          </p>
          <p className="mt-0.5 whitespace-pre-line">{fiche.my_note}</p>
        </div>
      )}
    </div>
  );
}
