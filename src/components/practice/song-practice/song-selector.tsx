"use client";

import { useState, useMemo } from "react";
import { Check, Search, X } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { Song } from "@/types";

interface SongSelectorProps {
  songs: Song[];
  selectedSong: Song | null;
  onSelectSong: (song: Song | null) => void;
  onUpdateTargetBpm?: (songId: string, targetBpm: number) => void;
}

export function SongSelector({
  songs,
  selectedSong,
  onSelectSong,
  onUpdateTargetBpm,
}: SongSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTargetBpm, setEditingTargetBpm] = useState<string | null>(null);
  const [tempTargetBpm, setTempTargetBpm] = useState<string>("");

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;

    const query = searchQuery.toLowerCase();
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  const handleSaveTargetBpm = (songId: string) => {
    const bpm = parseInt(tempTargetBpm);
    if (!isNaN(bpm) && bpm >= 20 && bpm <= 300) {
      onUpdateTargetBpm?.(songId, bpm);
    }
    setEditingTargetBpm(null);
  };

  /*
   * Style Atelier (docs/refonte-ui.md) : des lignes a filets, pas de
   * cartes. Le morceau au pupitre est marque par un trait d'encre, pas par
   * un aplat ambre — l'ambre reste au bouton du metronome.
   */
  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Rechercher un morceau</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          placeholder="Rechercher un morceau…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-[38px] w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      {selectedSong && (
        <div className="flex items-center gap-3 border-l-2 border-foreground py-1 pl-3">
          <Cover src={selectedSong.cover_url} className="h-12 w-12 rounded-[4px]" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Au pupitre
            </p>
            <p className="truncate font-semibold">{selectedSong.title}</p>
            <p className="truncate text-sm text-muted-foreground">{selectedSong.artist}</p>
          </div>
          {selectedSong.target_bpm && (
            <p className="tabular text-right font-display text-2xl font-bold leading-none">
              {selectedSong.target_bpm}
              <span className="block font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                cible
              </span>
            </p>
          )}
          <button
            onClick={() => onSelectSong(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Changer
          </button>
        </div>
      )}

      <ul className="max-h-[420px] overflow-y-auto border-t border-border">
        {filteredSongs.map((song) => {
          const isSelected = selectedSong?.id === song.id;
          return (
            <li
              key={song.id}
              className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 ${
                isSelected ? "bg-accent/60" : ""
              }`}
            >
              <Cover src={song.cover_url} className="h-10 w-10 rounded-[3px]" />

              <button
                onClick={() => onSelectSong(song)}
                aria-current={isSelected ? "true" : undefined}
                className="min-w-0 text-left"
              >
                <span className="block truncate text-sm font-semibold">{song.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{song.artist}</span>
              </button>

              <div className="flex items-center gap-1 pr-1">
                {editingTargetBpm === song.id ? (
                  <>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={tempTargetBpm}
                      onChange={(e) => setTempTargetBpm(e.target.value)}
                      min={20}
                      max={300}
                      aria-label={`Tempo cible pour ${song.title}`}
                      className="tabular w-16 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTargetBpm(song.id);
                        if (e.key === "Escape") setEditingTargetBpm(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveTargetBpm(song.id)}
                      aria-label="Enregistrer le tempo cible"
                      className="rounded-lg p-1.5 text-success hover:bg-accent"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setEditingTargetBpm(null)}
                      aria-label="Annuler"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTargetBpm(song.id);
                      setTempTargetBpm(song.target_bpm?.toString() || "");
                    }}
                    className="tabular rounded-lg px-2 py-1 text-xs transition-colors hover:bg-accent"
                  >
                    {song.target_bpm ? (
                      <>
                        <span className="font-display text-base font-bold">{song.target_bpm}</span>
                        <span className="text-muted-foreground"> bpm</span>
                      </>
                    ) : (
                      // Visible au doigt ; reveles au survol seulement sur ordi.
                      <span className="font-semibold text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100">
                        + BPM cible
                      </span>
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}

        {filteredSongs.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">Aucun morceau trouvé</li>
        )}
      </ul>
    </div>
  );
}
