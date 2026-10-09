"use client";

import { Globe, Lock, Music, Play, Users } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoverCardProps {
  cover: CoverWithSong;
  onClick: () => void;
}

const VISIBILITY: Record<CoverVisibility, { label: string; Icon: typeof Lock }> = {
  private: { label: "Privé", Icon: Lock },
  friends: { label: "Amis", Icon: Users },
  public: { label: "Public", Icon: Globe },
};

/**
 * Une cover de l'archive personnelle (Biblio > Covers).
 *
 * Une tuile plutot qu'une carte : la vignette porte la visibilite et la
 * duree, le texte repose sur le fond (style Etagere, docs/refonte-ui.md).
 * Sans vignette video, c'est la pochette du morceau qui tient lieu
 * d'image.
 */
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
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  };

  const { label, Icon } = VISIBILITY[cover.visibility];
  const image = cover.thumbnail_url ?? cover.song.cover_url;

  return (
    <button
      onClick={onClick}
      className="group w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Cover src={image} alt="" className="aspect-video w-full rounded-md">
        {cover.media_type === "video" && !image && (
          <video
            src={cover.media_url}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
        {cover.media_type !== "video" && !image && (
          <Music className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
            <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={0} aria-hidden="true" />
          </span>
        </span>

        <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          {label}
        </span>

        {cover.duration_seconds && (
          <span className="tabular absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white">
            {Math.floor(cover.duration_seconds / 60)}:{(cover.duration_seconds % 60).toString().padStart(2, "0")}
          </span>
        )}
      </Cover>

      <div className="pt-2">
        <h3 className="truncate text-sm font-semibold">{cover.song.title}</h3>
        <p className="truncate text-[13px] text-muted-foreground">
          {cover.song.artist}
          <span aria-hidden="true"> · </span>
          {formatDate(cover.created_at)}
          {cover.file_size_bytes && (
            <>
              <span aria-hidden="true"> · </span>
              {formatFileSize(cover.file_size_bytes)}
            </>
          )}
        </p>
      </div>
    </button>
  );
}
