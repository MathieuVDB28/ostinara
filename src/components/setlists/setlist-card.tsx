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
      className="group w-full overflow-hidden rounded-xl border-l-4 border-l-primary border border-border bg-card p-5 text-left transition-all hover:bg-primary/[0.02] hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-xl">queue_music</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{setlist.name}</h3>

          {setlist.venue && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{setlist.venue}</p>
          )}

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">music_note</span>
              {setlist.song_count} morceau{setlist.song_count > 1 ? "x" : ""}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {formatDuration(setlist.total_duration_seconds)}
            </span>
            {setlist.band && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {setlist.band.name}
              </span>
            )}
            {setlist.concert_date && (
              <span className={`flex items-center gap-1 ${isUpcoming ? "text-success" : ""}`}>
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {formatDate(setlist.concert_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
