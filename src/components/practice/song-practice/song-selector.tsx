"use client";

import { useState, useMemo } from "react";
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

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un morceau..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      {/* Selected song */}
      {selectedSong && (
        <div className="rounded-xl border border-primary bg-primary/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Morceau sélectionné</span>
            <button
              onClick={() => onSelectSong(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Changer
            </button>
          </div>
          <div className="flex items-center gap-3">
            {selectedSong.cover_url ? (
              <img
                src={selectedSong.cover_url}
                alt={selectedSong.title}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <div className="font-medium">{selectedSong.title}</div>
              <div className="text-sm text-muted-foreground">{selectedSong.artist}</div>
            </div>
            {selectedSong.target_bpm && (
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {selectedSong.target_bpm}
                </div>
                <div className="text-xs text-muted-foreground">BPM cible</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Song list */}
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {filteredSongs.map((song) => (
          <div
            key={song.id}
            className={`group flex items-center gap-3 rounded-lg border p-3 transition-all ${
              selectedSong?.id === song.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {/* Cover */}
            {song.cover_url ? (
              <img
                src={song.cover_url}
                alt={song.title}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            )}

            {/* Info */}
            <button
              onClick={() => onSelectSong(song)}
              className="flex-1 text-left"
            >
              <div className="text-sm font-medium">{song.title}</div>
              <div className="text-xs text-muted-foreground">{song.artist}</div>
            </button>

            {/* Target BPM */}
            <div className="flex items-center gap-2">
              {editingTargetBpm === song.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={tempTargetBpm}
                    onChange={(e) => setTempTargetBpm(e.target.value)}
                    min={20}
                    max={300}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTargetBpm(song.id);
                      if (e.key === "Escape") setEditingTargetBpm(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveTargetBpm(song.id)}
                    className="rounded p-1 text-green-400 hover:bg-green-400/20"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingTargetBpm(null)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingTargetBpm(song.id);
                    setTempTargetBpm(song.target_bpm?.toString() || "");
                  }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-accent"
                >
                  {song.target_bpm ? (
                    <>
                      <span className="font-medium text-primary">
                        {song.target_bpm}
                      </span>
                      <span className="text-muted-foreground">BPM</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100">
                      + BPM cible
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredSongs.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>Aucun morceau trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
