"use client";

import { SongCard } from "./song-card";
import type { PlaylistWithSongs, Song } from "@/types";

interface PlaylistDetailViewProps {
  playlist: PlaylistWithSongs;
  onBack: () => void;
  onEdit: () => void;
  onSongClick: (song: Song) => void;
}

export function PlaylistDetailView({ playlist, onBack, onEdit, onSongClick }: PlaylistDetailViewProps) {
  const coverSongs = playlist.songs.slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mt-1 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Cover */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl shadow-lg">
          {playlist.cover_url ? (
            <img
              src={playlist.cover_url}
              alt={playlist.name}
              className="h-full w-full object-cover"
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
                  <div key={i} className="bg-muted" />
                );
              })}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{playlist.name}</h2>
          {playlist.description && (
            <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {playlist.song_count} morceau{playlist.song_count > 1 ? "x" : ""}
          </p>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Songs grid */}
      {playlist.songs.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlist.songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onClick={() => onSongClick(song)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-muted-foreground">Aucun morceau dans cette playlist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoute des morceaux depuis ta bibliothèque
          </p>
        </div>
      )}
    </div>
  );
}
