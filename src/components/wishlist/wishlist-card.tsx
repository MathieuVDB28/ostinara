"use client";

import type { WishlistSong } from "@/types";

interface WishlistCardProps {
  song: WishlistSong;
  onLearn: () => void;
  onRemove: () => void;
  isRemoving?: boolean;
}

export function WishlistCard({ song, onLearn, onRemove, isRemoving }: WishlistCardProps) {
  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      {/* Cover */}
      <div className="relative aspect-square">
        {song.cover_url ? (
          <img
            src={song.cover_url}
            alt={song.album || song.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <svg className="h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}

        {/* Wishlist badge */}
        <div className="absolute left-2 top-2 rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400">
          Wishlist
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate font-semibold">{song.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{song.artist}</p>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={onLearn}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Apprendre
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={isRemoving}
            className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
          >
            {isRemoving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
