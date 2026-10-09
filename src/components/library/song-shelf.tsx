"use client";

import { useMemo, useState } from "react";
import { Cover } from "@/components/ui/cover";
import { songProgress } from "./song-card";
import type { Song } from "@/types";

interface SongShelfProps {
  songs: Song[];
  bestBpm: Record<string, number | null>;
  onSelect: (song: Song) => void;
  /** Range sous une seule pochette les morceaux d'un meme album. */
  groupByAlbum?: boolean;
}

type ShelfEntry =
  | { kind: "song"; song: Song }
  | { kind: "album"; key: string; name: string; songs: Song[] };

/**
 * La cle d'album d'un morceau : le nom d'album quand Spotify l'a donne,
 * sinon la pochette — deux morceaux qui partagent la meme image viennent
 * du meme disque. Sans l'un ni l'autre, pas de regroupement.
 */
function albumKey(song: Song): string | null {
  const album = song.album?.trim();
  if (album) return `${song.artist}::${album}`.toLowerCase();
  return song.cover_url ?? null;
}

/**
 * Une etagere de pochettes, a parcourir au doigt (style Etagere,
 * docs/refonte-ui.md).
 *
 * Trois morceaux du Black Album d'affilee faisaient trois carres noirs
 * identiques : ils se rangent sous une seule pochette « ×3 », qui se
 * deplie sur place quand on la touche.
 */
export function SongShelf({ songs, bestBpm, onSelect, groupByAlbum = true }: SongShelfProps) {
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);

  const entries = useMemo<ShelfEntry[]>(() => {
    if (!groupByAlbum) return songs.map((song) => ({ kind: "song", song }));

    const byKey = new Map<string, Song[]>();
    for (const song of songs) {
      const key = albumKey(song);
      if (!key) continue;
      byKey.set(key, [...(byKey.get(key) ?? []), song]);
    }

    // L'ordre de l'etagere reste celui des morceaux : un album prend la
    // place de son premier morceau.
    const placed = new Set<string>();
    const result: ShelfEntry[] = [];
    for (const song of songs) {
      const key = albumKey(song);
      const group = key ? byKey.get(key) : undefined;
      if (key && group && group.length > 1) {
        if (placed.has(key)) continue;
        placed.add(key);
        result.push({ kind: "album", key, name: song.album?.trim() || song.artist, songs: group });
      } else {
        result.push({ kind: "song", song });
      }
    }
    return result;
  }, [songs, groupByAlbum]);

  return (
    <div
      className="-mx-4 flex snap-x snap-proximity scroll-pl-4 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:scroll-pl-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {entries.map((entry, index) => {
        const first = index === 0;

        if (entry.kind === "song") {
          return (
            <ShelfSong
              key={entry.song.id}
              song={entry.song}
              bestBpm={bestBpm[entry.song.id] ?? null}
              first={first}
              onSelect={onSelect}
            />
          );
        }

        const isOpen = openAlbum === entry.key;
        const lead = entry.songs[0];
        // Le plus avance du groupe donne la lecture de l'album replie.
        const best = entry.songs
          .map((song) => ({ song, ...songProgress(song, bestBpm[song.id] ?? null) }))
          .sort((a, b) => b.percent - a.percent)[0];

        return (
          <div key={entry.key} className="contents">
            <button
              type="button"
              onClick={() => setOpenAlbum(isOpen ? null : entry.key)}
              aria-expanded={isOpen}
              aria-label={`${entry.name}, ${entry.songs.length} morceaux`}
              className="group w-[104px] shrink-0 snap-start text-left lg:w-[132px]"
            >
              <ShelfCover src={lead.cover_url} first={first}>
                <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white">
                  {isOpen ? "−" : `×${entry.songs.length}`}
                </span>
              </ShelfCover>
              <span className="block truncate pr-2 pt-1.5 text-xs font-semibold">{entry.name}</span>
              <span className="block truncate pr-2 text-[11.5px] text-muted-foreground">
                {lead.status === "learning" && best && (
                  <span className="tabular font-bold text-primary">{progressLabel(best)} </span>
                )}
                {entry.songs.length} morceaux
              </span>
            </button>

            {isOpen &&
              entry.songs.map((song) => (
                <ShelfSong
                  key={song.id}
                  song={song}
                  bestBpm={bestBpm[song.id] ?? null}
                  first={false}
                  onSelect={onSelect}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function progressLabel({ tempo, percent }: ReturnType<typeof songProgress>) {
  return tempo ? `${tempo.achieved}/${tempo.target}` : `${percent} %`;
}

function ShelfCover({
  src,
  first,
  children,
}: {
  src?: string | null;
  first: boolean;
  children?: React.ReactNode;
}) {
  /*
   * Les pochettes se touchent, comme des disques dans un bac : l'ombre a
   * gauche de chacune suffit a les separer. Seule la premiere a un coin
   * arrondi, la ou commence la rangee.
   */
  return (
    <Cover
      src={src}
      className={`h-[104px] w-[104px] shadow-[-6px_0_12px_-4px_rgb(0_0_0/0.45)] lg:h-[132px] lg:w-[132px] ${
        first ? "rounded-l-md" : ""
      }`}
    >
      {children}
    </Cover>
  );
}

function ShelfSong({
  song,
  bestBpm,
  first,
  onSelect,
}: {
  song: Song;
  bestBpm: number | null;
  first: boolean;
  onSelect: (song: Song) => void;
}) {
  const progress = songProgress(song, bestBpm);
  const detail =
    song.capo_position > 0 ? `Capo ${song.capo_position}` : song.status === "learning" ? song.tuning : song.artist;

  return (
    <button
      type="button"
      onClick={() => onSelect(song)}
      className="w-[104px] shrink-0 snap-start text-left lg:w-[132px]"
    >
      <ShelfCover src={song.cover_url} first={first} />
      <span className="block truncate pr-2 pt-1.5 text-xs font-semibold">{song.title}</span>
      <span className="block truncate pr-2 text-[11.5px] text-muted-foreground">
        {song.status === "learning" && (
          <span className="tabular font-bold text-primary">{progressLabel(progress)} </span>
        )}
        {detail}
      </span>
    </button>
  );
}
