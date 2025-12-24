"use client";

import { useEffect, useCallback } from "react";
import type { FriendProfile, SongStatus } from "@/types";

interface FriendProfileModalProps {
  friendProfile: FriendProfile | null;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

const statusLabels: Record<SongStatus, string> = {
  want_to_learn: "A apprendre",
  learning: "En cours",
  mastered: "Maitrise",
};

const statusColors: Record<SongStatus, string> = {
  want_to_learn: "bg-secondary text-secondary-foreground",
  learning: "bg-primary/20 text-primary",
  mastered: "bg-green-500/20 text-green-400",
};

export function FriendProfileModal({
  friendProfile,
  isOpen,
  onClose,
  loading,
}: FriendProfileModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-bold">Profil</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : friendProfile ? (
            <>
              {/* Profile header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {friendProfile.profile.avatar_url ? (
                    <img
                      src={friendProfile.profile.avatar_url}
                      alt={friendProfile.profile.username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    friendProfile.profile.display_name?.[0]?.toUpperCase() ||
                    friendProfile.profile.username[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-bold">
                    {friendProfile.profile.display_name || friendProfile.profile.username}
                  </h3>
                  <p className="text-muted-foreground">@{friendProfile.profile.username}</p>
                </div>
                {friendProfile.profile.plan !== "free" && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {friendProfile.profile.plan.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{friendProfile.stats.totalSongs}</div>
                  <div className="text-sm text-muted-foreground">Morceaux</div>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{friendProfile.stats.masteredSongs}</div>
                  <div className="text-sm text-muted-foreground">Maitrises</div>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{friendProfile.stats.totalCovers}</div>
                  <div className="text-sm text-muted-foreground">Covers</div>
                </div>
              </div>

              {/* Songs section */}
              <div className="mb-6">
                <h4 className="mb-3 font-semibold">Morceaux ({friendProfile.songs.length})</h4>
                {friendProfile.songs.length > 0 ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {friendProfile.songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt={song.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{song.title}</div>
                          <div className="truncate text-sm text-muted-foreground">{song.artist}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[song.status]}`}>
                          {statusLabels[song.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun morceau</p>
                )}
              </div>

              {/* Covers section */}
              <div>
                <h4 className="mb-3 font-semibold">Covers ({friendProfile.covers.length})</h4>
                {friendProfile.covers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {friendProfile.covers.map((cover) => (
                      <div
                        key={cover.id}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        <div className="relative aspect-video bg-muted">
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
                              preload="metadata"
                            />
                          )}
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                              <svg className="ml-0.5 h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="truncate text-sm font-medium">{cover.song.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{cover.song.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun cover partage</p>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Profil non trouve
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
