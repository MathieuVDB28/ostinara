"use client";

import { useState } from "react";
import type { FavoriteSong, FavoriteAlbum } from "@/types";

type FavoriteItem = FavoriteSong | FavoriteAlbum;

interface FavoritesGridProps {
  items: FavoriteItem[];
  mode: 'view' | 'edit';
  type: 'songs' | 'albums';
  onAdd?: (position: number) => void;
  onRemove?: (position: number) => void;
  onReorder?: (fromPosition: number, toPosition: number) => void;
}

function isFavoriteSong(item: FavoriteItem): item is FavoriteSong {
  return 'song' in item;
}

export function FavoritesGrid({ items, mode, type, onAdd, onRemove, onReorder }: FavoritesGridProps) {
  const positions = [1, 2, 3, 4];
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);

  const getItemAtPosition = (position: number): FavoriteItem | null => {
    return items.find((item) => item.position === position) || null;
  };

  const getItemDisplay = (item: FavoriteItem | null) => {
    if (!item) return null;

    if (isFavoriteSong(item)) {
      return {
        title: item.song.title,
        artist: item.song.artist,
        coverUrl: item.song.cover_url,
      };
    } else {
      return {
        title: item.album_name,
        artist: item.artist_name,
        coverUrl: item.cover_url,
      };
    }
  };

  const handleDragStart = (position: number) => {
    setDraggedPosition(position);
  };

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent, toPosition: number) => {
    e.preventDefault();
    if (draggedPosition !== null && draggedPosition !== toPosition && onReorder) {
      onReorder(draggedPosition, toPosition);
    }
    setDraggedPosition(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedPosition(null);
    setDragOverPosition(null);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {positions.map((position) => {
        const item = getItemAtPosition(position);
        const display = getItemDisplay(item);

        return (
          <div key={position} className="relative">
            {item && display ? (
              <div
                draggable={mode === 'edit'}
                onDragStart={() => handleDragStart(position)}
                onDragOver={(e) => handleDragOver(e, position)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, position)}
                onDragEnd={handleDragEnd}
                className={`group relative overflow-hidden rounded-lg border transition-all ${
                  draggedPosition === position
                    ? "opacity-50 cursor-grabbing"
                    : dragOverPosition === position
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:shadow-lg"
                } ${mode === 'edit' ? 'cursor-grab' : ''}`}
              >
                {/* Cover */}
                <div className="relative aspect-square bg-muted">
                  {display.coverUrl ? (
                    <img
                      src={display.coverUrl}
                      alt={display.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Drag indicator in edit mode */}
                  {mode === 'edit' && (
                    <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <div className="truncate text-sm font-medium">{display.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{display.artist}</div>
                </div>

                {/* Remove button in edit mode */}
                {mode === 'edit' && onRemove && (
                  <button
                    onClick={() => onRemove(position)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              // Empty slot
              <div
                onDragOver={(e) => handleDragOver(e, position)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, position)}
                className="relative"
              >
                {mode === 'edit' && onAdd ? (
                  <button
                    onClick={() => onAdd(position)}
                    className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary ${
                      dragOverPosition === position
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border"
                    }`}
                  >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-medium">Ajouter</span>
                  </button>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                    <svg className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
