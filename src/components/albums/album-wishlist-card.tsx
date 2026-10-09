"use client";

import type { AlbumWishlistItem } from "@/types";
import { Icon } from "@/components/ui/icon";

interface AlbumWishlistCardProps {
  album: AlbumWishlistItem;
  onListen: () => void;
  onRemove: () => void;
  isRemoving?: boolean;
}

export function AlbumWishlistCard({ album, onListen, onRemove, isRemoving }: AlbumWishlistCardProps) {
  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.album_name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="album" className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Wishlist badge */}
        <div className="absolute left-2 top-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
          A écouter
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="truncate font-semibold">{album.album_name}</h3>
        <p className="truncate text-sm text-muted-foreground">{album.artist_name}</p>

        {(album.release_date || album.total_tracks) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {album.release_date?.split("-")[0]}
            {album.release_date && album.total_tracks ? " - " : ""}
            {album.total_tracks ? `${album.total_tracks} titres` : ""}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={onListen}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <Icon name="rate_review" className="h-[16px] w-[16px]" />
            Écouté
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
              <Icon name="delete" className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
