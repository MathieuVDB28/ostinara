"use client";

import type { Song, SongStatus } from "@/types";

interface SongCardProps {
  song: Song;
  onClick: () => void;
}

const statusLabels: Record<SongStatus, string> = {
  want_to_learn: "À apprendre",
  learning: "En cours",
  mastered: "Maîtrisé",
};

const statusColors: Record<SongStatus, string> = {
  want_to_learn: "bg-secondary text-secondary-foreground",
  learning: "bg-primary/20 text-primary",
  mastered: "bg-green-500/20 text-green-400",
};

const difficultyLabels: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

export function SongCard({ song, onClick }: SongCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
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

        {/* Status badge */}
        <div className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${statusColors[song.status]}`}>
          {statusLabels[song.status]}
        </div>

        {/* Notes indicator */}
        {song.notes && (
          <div className="absolute right-2 top-2 rounded-lg bg-background/80 p-1.5 backdrop-blur-sm">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        )}

        {/* Progress bar overlay */}
        {song.status === "learning" && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 pt-8">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${song.progress_percent}%` }}
                />
              </div>
              <span className="text-sm font-medium">{song.progress_percent}%</span>
            </div>
          </div>
        )}

        {/* Mastered checkmark */}
        {song.status === "mastered" && (
          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate font-semibold">{song.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{song.artist}</p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {song.difficulty && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
              {difficultyLabels[song.difficulty]}
            </span>
          )}
          {song.tuning !== "Standard" && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
              {song.tuning}
            </span>
          )}
          {song.capo_position > 0 && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs">
              Capo {song.capo_position}
            </span>
          )}
          {song.tabs_url && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Tab
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
