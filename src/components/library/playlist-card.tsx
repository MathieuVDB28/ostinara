"use client";

import { useState } from "react";
import type { PlaylistWithSongs } from "@/types";
import { deletePlaylist } from "@/lib/actions/playlists";

interface PlaylistCardProps {
  playlist: PlaylistWithSongs;
  onClick: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

export function PlaylistCard({ playlist, onClick, onEdit, onRefresh }: PlaylistCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const coverSongs = playlist.songs.slice(0, 4);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette playlist ?")) return;
    setDeleting(true);
    const result = await deletePlaylist(playlist.id);
    if (result.success) {
      onRefresh();
    }
    setDeleting(false);
    setShowMenu(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Cover mosaic */}
      <div className="relative aspect-square">
        {playlist.cover_url ? (
          <img
            src={playlist.cover_url}
            alt={playlist.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : coverSongs.length > 0 ? (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2">
            {[0, 1, 2, 3].map((i) => {
              const song = coverSongs[i];
              return song?.cover_url ? (
                <img
                  key={i}
                  src={song.cover_url}
                  alt={song.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  key={i}
                  className="flex h-full w-full items-center justify-center bg-muted"
                >
                  {song ? (
                    <svg className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  ) : (
                    <div className="h-full w-full bg-muted/50" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <svg className="h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )}

        {/* Song count badge */}
        <div className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
          {playlist.song_count} morceau{playlist.song_count > 1 ? "x" : ""}
        </div>

        {/* Menu button */}
        <div className="absolute right-2 top-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-lg bg-background/50 p-1.5 opacity-0 backdrop-blur-sm transition-all hover:bg-background group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={handleEdit}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? "..." : "Supprimer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate font-semibold">{playlist.name}</h3>
        {playlist.description ? (
          <p className="truncate text-sm text-muted-foreground">{playlist.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {playlist.song_count} morceau{playlist.song_count > 1 ? "x" : ""}
          </p>
        )}
      </div>
    </button>
  );
}
