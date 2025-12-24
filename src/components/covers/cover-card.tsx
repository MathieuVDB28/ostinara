"use client";

import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoverCardProps {
  cover: CoverWithSong;
  onClick: () => void;
}

const visibilityIcons: Record<CoverVisibility, React.ReactNode> = {
  private: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  friends: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  public: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const visibilityLabels: Record<CoverVisibility, string> = {
  private: "Privé",
  friends: "Amis",
  public: "Public",
};

export function CoverCard({ cover, onClick }: CoverCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Thumbnail vidéo */}
      <div className="relative aspect-video bg-muted">
        {cover.media_type === "video" ? (
          <>
            {cover.thumbnail_url ? (
              <img
                src={cover.thumbnail_url}
                alt={`Cover de ${cover.song.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={cover.media_url}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            )}
            {/* Bouton play en overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}

        {/* Badge visibilité */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
          {visibilityIcons[cover.visibility]}
          <span>{visibilityLabels[cover.visibility]}</span>
        </div>

        {/* Badge durée */}
        {cover.duration_seconds && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {Math.floor(cover.duration_seconds / 60)}:{(cover.duration_seconds % 60).toString().padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4">
        <h3 className="truncate font-semibold">{cover.song.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{cover.song.artist}</p>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(cover.created_at)}</span>
          {cover.file_size_bytes && (
            <>
              <span>•</span>
              <span>{formatFileSize(cover.file_size_bytes)}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
