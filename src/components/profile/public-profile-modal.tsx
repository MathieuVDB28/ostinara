"use client";

import { useEffect, useCallback, useState } from "react";
import type { PublicProfile } from "@/types";
import { SocialLinks } from "./social-links";
import { FavoritesGrid } from "./favorites-grid";
import { PrivacyBadge } from "./privacy-badge";
import { getPublicProfile } from "@/lib/actions/profile";

interface PublicProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const statusLabels = {
  want_to_learn: "A apprendre",
  learning: "En cours",
  mastered: "Maitrise",
};

const statusColors = {
  want_to_learn: "bg-secondary text-secondary-foreground",
  learning: "bg-primary/20 text-primary",
  mastered: "bg-green-500/20 text-green-400",
};

export function PublicProfileModal({ userId, isOpen, onClose }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    if (isOpen && userId) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";

      // Charger le profil public
      setLoading(true);
      getPublicProfile(userId)
        .then((data) => {
          setProfile(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, userId, handleClose]);

  if (!isOpen) return null;

  const canViewPrivateContent = profile && (
    !profile.profile.is_private ||
    profile.is_friend ||
    profile.friendship_status === 'self'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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
          ) : profile ? (
            <>
              {/* Profile header */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                  {profile.profile.avatar_url ? (
                    <img
                      src={profile.profile.avatar_url}
                      alt={profile.profile.username}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    profile.profile.display_name?.[0]?.toUpperCase() || profile.profile.username[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-2xl font-bold">
                      {profile.profile.display_name || profile.profile.username}
                    </h3>
                    {profile.profile.plan !== "free" && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {profile.profile.plan.toUpperCase()}
                      </span>
                    )}
                    {profile.profile.is_private && !canViewPrivateContent && (
                      <PrivacyBadge />
                    )}
                  </div>
                  <p className="text-muted-foreground">@{profile.profile.username}</p>
                </div>
              </div>

              {/* Private account message for non-friends */}
              {profile.profile.is_private && !canViewPrivateContent ? (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="mb-2 text-lg font-semibold">Ce compte est privé</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Devenez ami pour voir le contenu de ce profil
                  </p>
                  {profile.friendship_status === 'none' && (
                    <button className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
                      Envoyer une demande d&apos;ami
                    </button>
                  )}
                  {profile.friendship_status === 'pending' && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Demande envoyée
                    </div>
                  )}

                  {/* Stats visibles même pour compte privé */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-accent p-4 text-center">
                      <div className="text-2xl font-bold">{profile.stats.totalSongs ?? "?"}</div>
                      <div className="text-xs text-muted-foreground">Morceaux</div>
                    </div>
                    <div className="rounded-lg bg-accent p-4 text-center">
                      <div className="text-2xl font-bold">{profile.stats.totalCovers}</div>
                      <div className="text-xs text-muted-foreground">Covers</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Bio */}
                  {profile.profile.bio && (
                    <div className="mb-6">
                      <p className="text-foreground">{profile.profile.bio}</p>
                    </div>
                  )}

                  {/* Social links */}
                  {(profile.profile.instagram_url || profile.profile.tiktok_url || profile.profile.twitter_url || profile.profile.facebook_url) && (
                    <div className="mb-6">
                      <SocialLinks
                        links={{
                          instagram: profile.profile.instagram_url,
                          tiktok: profile.profile.tiktok_url,
                          twitter: profile.profile.twitter_url,
                          facebook: profile.profile.facebook_url,
                        }}
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-accent p-4 text-center">
                      <div className="text-2xl font-bold">{profile.stats.totalSongs ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Morceaux</div>
                    </div>
                    <div className="rounded-lg bg-accent p-4 text-center">
                      <div className="text-2xl font-bold">{profile.stats.masteredSongs ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Maîtrisés</div>
                    </div>
                    <div className="rounded-lg bg-accent p-4 text-center">
                      <div className="text-2xl font-bold">{profile.stats.totalCovers}</div>
                      <div className="text-xs text-muted-foreground">Covers</div>
                    </div>
                  </div>

                  {/* Favorite songs */}
                  {profile.favorite_songs && profile.favorite_songs.length > 0 && (
                    <div className="mb-6">
                      <h4 className="mb-3 font-semibold">Morceaux favoris</h4>
                      <FavoritesGrid
                        items={profile.favorite_songs}
                        mode="view"
                        type="songs"
                      />
                    </div>
                  )}

                  {/* Favorite albums */}
                  {profile.favorite_albums && profile.favorite_albums.length > 0 && (
                    <div className="mb-6">
                      <h4 className="mb-3 font-semibold">Albums favoris</h4>
                      <FavoritesGrid
                        items={profile.favorite_albums}
                        mode="view"
                        type="albums"
                      />
                    </div>
                  )}

                  {/* Recent songs */}
                  {profile.recent_songs && profile.recent_songs.length > 0 && (
                    <div className="mb-6">
                      <h4 className="mb-3 font-semibold">Morceaux récents</h4>
                      <div className="space-y-2">
                        {profile.recent_songs.slice(0, 6).map((song) => (
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
                    </div>
                  )}

                  {/* Recent covers */}
                  {profile.recent_covers && profile.recent_covers.length > 0 && (
                    <div>
                      <h4 className="mb-3 font-semibold">Covers récents</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {profile.recent_covers.slice(0, 6).map((cover) => (
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
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Profil non trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
