"use client";

import type { SetlistWithDetails, SetlistItem } from "@/types";

interface JamSongQueueProps {
  setlist: SetlistWithDetails;
  currentIndex: number | null;
  isHost: boolean;
  onSongSelect: (index: number, item: SetlistItem) => void;
}

export function JamSongQueue({
  setlist,
  currentIndex,
  isHost,
  onSongSelect,
}: JamSongQueueProps) {
  const songs = setlist.items.filter((item) => item.item_type === "song");

  if (songs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-3">
        <h3 className="font-semibold">
          Setlist : {setlist.name}{" "}
          <span className="text-muted-foreground font-normal">
            ({songs.length} morceaux)
          </span>
        </h3>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {songs.map((item, index) => {
          const isCurrent = currentIndex === index;
          const position = index + 1;

          return (
            <button
              key={item.id}
              onClick={() => isHost && onSongSelect(index, item)}
              disabled={!isHost}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                isCurrent
                  ? "bg-primary/20"
                  : isHost
                  ? "hover:bg-accent/50"
                  : ""
              } ${!isHost ? "cursor-default" : ""}`}
            >
              {/* Position / Playing indicator */}
              <div
                className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-sm font-medium ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                }`}
              >
                {isCurrent ? (
                  <svg
                    className="h-4 w-4 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  position
                )}
              </div>

              {/* Cover art */}
              {item.song_cover_url ? (
                <img
                  src={item.song_cover_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              )}

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate font-medium ${
                    isCurrent ? "text-primary" : ""
                  }`}
                >
                  {item.song_title}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {item.song_artist}
                </p>
              </div>

              {/* Current indicator */}
              {isCurrent && (
                <span className="shrink-0 text-xs font-medium text-primary">
                  En cours
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
