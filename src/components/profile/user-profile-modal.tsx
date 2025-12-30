"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { SocialLinks } from "./social-links";
import { FavoritesGrid } from "./favorites-grid";
import { getMyProfile } from "@/lib/actions/profile";

interface UserProfileModalProps {
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

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Charger le profil
      setLoading(true);
      getMyProfile()
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
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-bold">Mon Profil</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleClose();
                router.push("/profile/edit");
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Éditer le profil
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-2xl font-bold">
                      {profile.display_name || profile.username}
                    </h3>
                    {profile.plan !== "free" && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {profile.plan.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mb-6">
                  <p className="text-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Social links */}
              {(profile.instagram_url || profile.tiktok_url || profile.twitter_url || profile.facebook_url) && (
                <div className="mb-6">
                  <SocialLinks
                    links={{
                      instagram: profile.instagram_url,
                      tiktok: profile.tiktok_url,
                      twitter: profile.twitter_url,
                      facebook: profile.facebook_url,
                    }}
                  />
                </div>
              )}

              {/* Stats */}
              <div className="mb-6 grid grid-cols-4 gap-3">
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{profile.stats.totalSongs}</div>
                  <div className="text-xs text-muted-foreground">Morceaux</div>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{profile.stats.masteredSongs}</div>
                  <div className="text-xs text-muted-foreground">Maîtrisés</div>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{profile.stats.totalCovers}</div>
                  <div className="text-xs text-muted-foreground">Covers</div>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <div className="text-2xl font-bold">{profile.stats.friendsCount}</div>
                  <div className="text-xs text-muted-foreground">Amis</div>
                </div>
              </div>

              {/* Favorite songs */}
              <div className="mb-6">
                <h4 className="mb-3 font-semibold">Morceaux favoris</h4>
                {profile.favorite_songs.length > 0 ? (
                  <FavoritesGrid
                    items={profile.favorite_songs}
                    mode="view"
                    type="songs"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                    <svg className="mb-2 h-12 w-12 text-muted-foreground opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <p className="font-medium text-muted-foreground">Tes coups de cœur musicaux</p>
                    <p className="text-sm text-muted-foreground">Sélectionne tes 4 morceaux préférés pour les mettre en avant</p>
                  </div>
                )}
              </div>

              {/* Favorite albums */}
              <div className="mb-6">
                <h4 className="mb-3 font-semibold">Albums favoris</h4>
                {profile.favorite_albums.length > 0 ? (
                  <FavoritesGrid
                    items={profile.favorite_albums}
                    mode="view"
                    type="albums"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                    <svg className="mb-2 h-12 w-12 text-muted-foreground opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm0 0V9m10.5-3.5l-10.5 3" />
                    </svg>
                    <p className="font-medium text-muted-foreground">Tes albums cultes</p>
                    <p className="text-sm text-muted-foreground">Choisis 4 albums qui te définissent</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Erreur lors du chargement du profil
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
