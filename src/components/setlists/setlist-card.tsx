"use client";

import type { SetlistWithDetails } from "@/types";

interface SetlistCardProps {
  setlist: SetlistWithDetails;
  onClick: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  return `${minutes}min`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SetlistCard({ setlist, onClick }: SetlistCardProps) {
  const isUpcoming =
    setlist.concert_date && new Date(setlist.concert_date) > new Date();

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Header with gradient */}
      <div className="relative h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent">
        {/* Band badge */}
        {setlist.band && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{setlist.band.name}</span>
          </div>
        )}

        {/* Concert date badge */}
        {setlist.concert_date && (
          <div
            className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
              isUpcoming
                ? "bg-green-500/20 text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(setlist.concert_date)}</span>
          </div>
        )}

        {/* Setlist icon */}
        <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
            />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path strokeLinecap="round" d="M9 12h6M9 16h4" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate font-semibold text-foreground">
          {setlist.name}
        </h3>

        {setlist.venue && (
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {setlist.venue}
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
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
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span>
              {setlist.song_count} morceau{setlist.song_count > 1 ? "x" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formatDuration(setlist.total_duration_seconds)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
