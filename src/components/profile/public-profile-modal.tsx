"use client";

import Image from "next/image";
import { useEffect, useCallback, useState, useMemo } from "react";
import type {
  PublicProfile,
  Song,
  SongStatus,
  SongDifficulty,
  PlaylistWithSongs,
  AlbumReview,
  CoverWithSong,
  PracticeSessionWithSong,
  SessionMood,
  GearItem,
  GearType,
  GearCondition,
} from "@/types";
import { GEAR_TYPE_LABELS, GEAR_CONDITION_LABELS, GEAR_CONDITION_COLORS } from "@/types";
import { SocialLinks } from "./social-links";
import { FavoritesGrid } from "./favorites-grid";
import { PrivacyBadge } from "./privacy-badge";
import { getPublicProfile } from "@/lib/actions/profile";
import { CoverInteractions } from "@/components/social/cover-interactions";

interface PublicProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = "library" | "gear" | "albums" | "activity";
type LibrarySubTab = "learning" | "mastered" | "wishlist" | "playlists";

const statusLabels: Record<SongStatus, string> = {
  want_to_learn: "A apprendre",
  learning: "En cours",
  mastered: "Maîtrisé",
};

const statusColors: Record<SongStatus, string> = {
  want_to_learn: "bg-muted text-muted-foreground",
  learning: "bg-primary/15 text-primary",
  mastered: "bg-success/15 text-success",
};

const difficultyLabels: Record<SongDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

const difficultyColors: Record<SongDifficulty, string> = {
  beginner: "bg-success/20 text-success",
  intermediate: "bg-chart-2/20 text-chart-2",
  advanced: "bg-primary/20 text-primary",
  expert: "bg-destructive/20 text-destructive",
};

const moodLabels: Record<SessionMood, string> = {
  frustrated: "Frustré",
  neutral: "Neutre",
  good: "Bien",
  great: "Super",
  on_fire: "En feu",
};

const moodEmojis: Record<SessionMood, string> = {
  frustrated: "😤",
  neutral: "😐",
  good: "🙂",
  great: "😎",
  on_fire: "🔥",
};

const tuningLabels: Record<string, string> = {
  standard: "Standard (EADGBE)",
  drop_d: "Drop D",
  open_g: "Open G",
  open_d: "Open D",
  dadgad: "DADGAD",
  half_step_down: "½ ton en dessous",
  full_step_down: "1 ton en dessous",
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function PublicProfileModal({ userId, isOpen, onClose }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("library");
  const [librarySubTab, setLibrarySubTab] = useState<LibrarySubTab>("learning");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    setSelectedSong(null);
    setActiveTab("library");
    setLibrarySubTab("learning");
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSong) {
          setSelectedSong(null);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen && userId) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";

      setLoading(true);
      getPublicProfile(userId)
        .then((data) => setProfile(data))
        .finally(() => setLoading(false));
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, userId, handleClose, selectedSong]);

  // Filtered songs
  const learningSongs = useMemo(
    () => profile?.all_songs?.filter((s) => s.status === "learning") || [],
    [profile?.all_songs]
  );
  const masteredSongs = useMemo(
    () => profile?.all_songs?.filter((s) => s.status === "mastered") || [],
    [profile?.all_songs]
  );
  // "A apprendre" a remplace la table wishlist_songs : un seul endroit
  // ou un morceau souhaite est enregistre.
  const wantedSongs = useMemo(
    () => profile?.all_songs?.filter((s) => s.status === "want_to_learn") || [],
    [profile?.all_songs]
  );

  // Covers for a specific song
  const coversForSong = useMemo(() => {
    if (!selectedSong || !profile?.recent_covers) return [];
    return profile.recent_covers.filter((c) => c.song_id === selectedSong.id);
  }, [selectedSong, profile?.recent_covers]);

  if (!isOpen) return null;

  const canViewPrivateContent =
    profile &&
    (!profile.profile.is_private ||
      profile.is_friend ||
      profile.friendship_status === "self");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Close button */}
        <button aria-label="Fermer"
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : profile ? (
            <>
              {/* ===== PROFILE HEADER ===== */}
              <div className="relative overflow-hidden border-b border-border px-6 pb-6 pt-8">
                {/* Decorative gradient */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />

                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                      {profile.profile.avatar_url ? (
                        <Image
                          src={profile.profile.avatar_url}
                          alt={profile.profile.username}
                          className="h-20 w-20 rounded-full object-cover"
                          width={80}
                          height={80}
                        />
                      ) : (
                        profile.profile.display_name?.[0]?.toUpperCase() ||
                        profile.profile.username[0].toUpperCase()
                      )}
                    </div>
                    {profile.profile.plan !== "free" && (
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                        {profile.profile.plan.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-2xl font-extrabold">
                        {profile.profile.display_name || profile.profile.username}
                      </h3>
                      {profile.profile.is_private && !canViewPrivateContent && (
                        <PrivacyBadge />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{profile.profile.username}</p>

                    {/* Bio */}
                    {profile.profile.bio && canViewPrivateContent && (
                      <p className="mt-2 text-sm text-foreground/80">{profile.profile.bio}</p>
                    )}

                    {/* Social links */}
                    {canViewPrivateContent &&
                      (profile.profile.instagram_url ||
                        profile.profile.tiktok_url ||
                        profile.profile.twitter_url ||
                        profile.profile.facebook_url) && (
                        <div className="mt-3">
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
                  </div>
                </div>
              </div>

              {/* ===== PRIVATE ACCOUNT ===== */}
              {profile.profile.is_private && !canViewPrivateContent ? (
                <div className="p-6">
                  <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="mb-2 text-lg font-semibold">Ce compte est privé</h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Devenez ami pour voir le contenu de ce profil
                    </p>
                    {profile.friendship_status === "none" && (
                      <button className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
                        Envoyer une demande d&apos;ami
                      </button>
                    )}
                    {profile.friendship_status === "pending" && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium">
                        <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Demande envoyée
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-accent p-4 text-center">
                        <div className="text-2xl font-bold">{profile.stats.totalSongs ?? "?"}</div>
                        <div className="text-xs text-muted-foreground">Morceaux</div>
                      </div>
                      <div className="rounded-xl bg-accent p-4 text-center">
                        <div className="text-2xl font-bold">{profile.stats.totalCovers}</div>
                        <div className="text-xs text-muted-foreground">Covers</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ===== STATS BAR ===== */}
                  <div className="border-b border-border px-6 py-4">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      <StatCard
                        icon="local_fire_department"
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        value={profile.practice_stats?.currentStreak ?? 0}
                        label="Streak"
                      />
                      <StatCard
                        icon="emoji_events"
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        value={profile.stats.masteredSongs ?? 0}
                        label="Maîtrisés"
                      />
                      <StatCard
                        icon="library_music"
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        value={profile.stats.totalSongs ?? 0}
                        label="Morceaux"
                      />
                      <StatCard
                        icon="headphones"
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        value={profile.practice_stats?.totalSessions ?? 0}
                        label="Sessions"
                      />
                      <StatCard
                        icon="videocam"
                        iconColor="text-destructive"
                        iconBg="bg-destructive/10"
                        value={profile.stats.totalCovers}
                        label="Covers"
                      />
                      <StatCard
                        icon="album"
                        iconColor="text-success"
                        iconBg="bg-success/10"
                        value={profile.stats.totalAlbumReviews}
                        label="Albums"
                      />
                    </div>
                  </div>

                  {/* ===== FAVORITES (compact) ===== */}
                  {((profile.favorite_songs && profile.favorite_songs.length > 0) ||
                    (profile.favorite_albums && profile.favorite_albums.length > 0) ||
                    (profile.favorite_gear && profile.favorite_gear.length > 0)) && (
                    <div className="border-b border-border px-6 py-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {profile.favorite_songs && profile.favorite_songs.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Morceaux favoris
                            </h4>
                            <FavoritesGrid items={profile.favorite_songs} mode="view" type="songs" />
                          </div>
                        )}
                        {profile.favorite_albums && profile.favorite_albums.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Albums favoris
                            </h4>
                            <FavoritesGrid items={profile.favorite_albums} mode="view" type="albums" />
                          </div>
                        )}
                        {profile.favorite_gear && profile.favorite_gear.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Matos favori
                            </h4>
                            <div className="space-y-2">
                              {profile.favorite_gear.map((fg) => (
                                <div key={fg.id} className="flex items-center gap-2 rounded-lg bg-accent/50 p-2">
                                  {fg.gear?.image_url ? (
                                    <img src={fg.gear.image_url} alt={fg.gear.model} className="h-8 w-8 rounded object-cover" />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-xs text-primary">
                                      {GEAR_TYPE_LABELS[fg.gear?.type || "other"]?.[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">{fg.gear?.brand} {fg.gear?.model}</p>
                                    <p className="text-[11px] text-muted-foreground">{GEAR_TYPE_LABELS[fg.gear?.type || "other"]}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===== MAIN TABS ===== */}
                  <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-6">
                    <div className="flex gap-1">
                      {(
                        [
                          { key: "library", label: "Bibliothèque", icon: "library_music" },
                          { key: "gear", label: "Matos", icon: "guitar" },
                          { key: "albums", label: "Albums", icon: "album" },
                          { key: "activity", label: "Activité", icon: "trending_up" },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab.key
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.icon === "guitar" ? (
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="11" cy="17" r="1.5"/>
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                          )}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ===== TAB CONTENT ===== */}
                  <div className="p-6">
                    {/* LIBRARY TAB */}
                    {activeTab === "library" && (
                      <div>
                        {/* Sub-tabs */}
                        <div className="mb-4 flex gap-2 overflow-x-auto">
                          {(
                            [
                              { key: "learning", label: "En cours", count: learningSongs.length },
                              { key: "mastered", label: "Maîtrisés", count: masteredSongs.length },
                              { key: "wishlist", label: "À apprendre", count: wantedSongs.length },
                              { key: "playlists", label: "Playlists", count: profile.playlists?.length ?? 0 },
                            ] as const
                          ).map((sub) => (
                            <button
                              key={sub.key}
                              onClick={() => setLibrarySubTab(sub.key)}
                              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                librarySubTab === sub.key
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {sub.label}
                              <span className="ml-1.5 opacity-70">{sub.count}</span>
                            </button>
                          ))}
                        </div>

                        {/* Learning songs */}
                        {librarySubTab === "learning" && (
                          <SongList songs={learningSongs} onSongClick={setSelectedSong} />
                        )}

                        {/* Mastered songs */}
                        {librarySubTab === "mastered" && (
                          <SongList songs={masteredSongs} onSongClick={setSelectedSong} />
                        )}

                        {/* Wishlist */}
                        {librarySubTab === "wishlist" && (
                          <SongList songs={wantedSongs} onSongClick={setSelectedSong} />
                        )}

                        {/* Playlists */}
                        {librarySubTab === "playlists" && (
                          <PlaylistList
                            playlists={profile.playlists || []}
                            expandedPlaylist={expandedPlaylist}
                            onTogglePlaylist={setExpandedPlaylist}
                            onSongClick={setSelectedSong}
                          />
                        )}
                      </div>
                    )}

                    {/* GEAR TAB */}
                    {activeTab === "gear" && (
                      <div>
                        {profile.gear_items && profile.gear_items.length > 0 ? (
                          <div className="space-y-3">
                            {profile.gear_items.map((gear) => (
                              <div
                                key={gear.id}
                                className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-4"
                              >
                                {/* Image */}
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                  {gear.image_url ? (
                                    <img src={gear.image_url} alt={gear.model} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
                                        <circle cx="11" cy="17" r="1.5"/>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate text-sm font-semibold">{gear.brand} {gear.model}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {GEAR_TYPE_LABELS[gear.type]}
                                    {gear.year ? ` · ${gear.year}` : ""}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {gear.condition && (
                                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${GEAR_CONDITION_COLORS[gear.condition]}`}>
                                        {GEAR_CONDITION_LABELS[gear.condition]}
                                      </span>
                                    )}
                                    {gear.is_active && (
                                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                                        Actif
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                              <svg className="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="11" cy="17" r="1.5"/>
                              </svg>
                            </div>
                            <p className="text-sm text-muted-foreground">Pas de matériel partagé</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ALBUMS TAB */}
                    {activeTab === "albums" && (
                      <AlbumReviewList reviews={profile.album_reviews || []} />
                    )}

                    {/* ACTIVITY TAB */}
                    {activeTab === "activity" && (
                      <div className="space-y-6">
                        {/* Practice stats summary */}
                        {profile.practice_stats && profile.practice_stats.totalSessions > 0 && (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-accent/50 p-3 text-center">
                              <div className="text-lg font-bold">{formatMinutes(profile.practice_stats.totalMinutes)}</div>
                              <div className="text-xs text-muted-foreground">Temps total</div>
                            </div>
                            <div className="rounded-xl bg-accent/50 p-3 text-center">
                              <div className="text-lg font-bold">{formatMinutes(profile.practice_stats.minutesThisWeek)}</div>
                              <div className="text-xs text-muted-foreground">Cette semaine</div>
                            </div>
                            <div className="rounded-xl bg-accent/50 p-3 text-center">
                              <div className="text-lg font-bold">{profile.practice_stats.totalSessions}</div>
                              <div className="text-xs text-muted-foreground">Sessions</div>
                            </div>
                            <div className="rounded-xl bg-accent/50 p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-primary text-[18px]">local_fire_department</span>
                                <span className="text-lg font-bold">{profile.practice_stats.currentStreak}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Jours de streak</div>
                            </div>
                          </div>
                        )}

                        {/* Recent sessions */}
                        {profile.recent_sessions && profile.recent_sessions.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                              Dernières sessions
                            </h4>
                            <div className="space-y-2">
                              {profile.recent_sessions.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent covers */}
                        {profile.recent_covers && profile.recent_covers.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                              Covers récentes
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {profile.recent_covers.slice(0, 6).map((cover) => (
                                <CoverCard key={cover.id} cover={cover} />
                              ))}
                            </div>
                          </div>
                        )}

                        {(!profile.recent_sessions || profile.recent_sessions.length === 0) &&
                          (!profile.recent_covers || profile.recent_covers.length === 0) && (
                            <EmptyState icon="trending_up" message="Pas encore d'activité" />
                          )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-24 text-center text-muted-foreground">
              Profil non trouvé
            </div>
          )}
        </div>
      </div>

      {/* ===== SONG DETAIL OVERLAY ===== */}
      {selectedSong && profile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedSong(null)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Song header */}
            <div className="relative overflow-hidden border-b border-border p-5">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent" />
              <button
                onClick={() => setSelectedSong(null)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                {selectedSong.cover_url ? (
                  <Image
                    src={selectedSong.cover_url}
                    alt={selectedSong.title}
                    className="h-20 w-20 rounded-xl object-cover shadow-md"
                    width={80}
                    height={80}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
                    <span className="material-symbols-outlined text-primary text-3xl">music_note</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold">{selectedSong.title}</h3>
                  <p className="truncate text-sm text-muted-foreground">{selectedSong.artist}</p>
                  {selectedSong.album && (
                    <p className="truncate text-xs text-muted-foreground/70">{selectedSong.album}</p>
                  )}
                  {/* Status + Progress */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[selectedSong.status]}`}>
                      {statusLabels[selectedSong.status]}
                    </span>
                    {selectedSong.status === "learning" && (
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${selectedSong.progress_percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-primary">{selectedSong.progress_percent}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Song details */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Parameters grid */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                {selectedSong.tuning && (
                  <DetailItem
                    icon="tune"
                    label="Accordage"
                    value={tuningLabels[selectedSong.tuning] || selectedSong.tuning}
                  />
                )}
                {selectedSong.capo_position > 0 && (
                  <DetailItem
                    icon="vertical_align_top"
                    label="Capo"
                    value={`Frette ${selectedSong.capo_position}`}
                  />
                )}
                {selectedSong.difficulty && (
                  <DetailItem
                    icon="speed"
                    label="Difficulté"
                    value={difficultyLabels[selectedSong.difficulty]}
                    valueClass={difficultyColors[selectedSong.difficulty]}
                  />
                )}
                {(selectedSong.target_bpm || selectedSong.spotify_bpm) && (
                  <DetailItem
                    icon="metronome"
                    label="BPM"
                    value={`${selectedSong.target_bpm || selectedSong.spotify_bpm}`}
                  />
                )}
              </div>

              {/* Notes */}
              {selectedSong.notes && (
                <div className="mb-5">
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h5>
                  <p className="rounded-lg bg-accent/50 p-3 text-sm text-foreground/80">{selectedSong.notes}</p>
                </div>
              )}

              {/* Tabs link */}
              {selectedSong.tabs_url && (
                <a
                  href={selectedSong.tabs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-5 flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  Voir la tablature
                  <span className="material-symbols-outlined ml-auto text-[16px]">open_in_new</span>
                </a>
              )}

              {/* Covers for this song */}
              {coversForSong.length > 0 && (
                <div>
                  <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Covers ({coversForSong.length})
                  </h5>
                  <div className="space-y-3">
                    {coversForSong.map((cover) => (
                      <div
                        key={cover.id}
                        className="overflow-hidden rounded-xl border border-border"
                      >
                        <div className="relative aspect-video bg-muted">
                          {cover.media_type === "video" ? (
                            <video
                              src={cover.media_url}
                              className="h-full w-full object-cover"
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/10">
                              <audio src={cover.media_url} controls className="w-4/5" preload="metadata" />
                            </div>
                          )}
                        </div>
                        {cover.description && (
                          <p className="px-3 pt-3 text-sm text-muted-foreground">{cover.description}</p>
                        )}
                        <CoverInteractions coverId={cover.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {coversForSong.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Pas de cover pour ce morceau
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function StatCard({
  icon,
  iconColor,
  iconBg,
  value,
  label,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-accent/50 p-3 text-center">
      <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SongList({ songs, onSongClick }: { songs: Song[]; onSongClick: (song: Song) => void }) {
  if (songs.length === 0) {
    return <EmptyState icon="music_note" message="Aucun morceau" />;
  }

  return (
    <div className="space-y-2">
      {songs.map((song) => (
        <button
          key={song.id}
          onClick={() => onSongClick(song)}
          className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          {song.cover_url ? (
            <Image src={song.cover_url} alt={song.title} className="h-12 w-12 rounded-lg object-cover"
              width={48}
              height={48}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <span className="material-symbols-outlined text-muted-foreground">music_note</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{song.title}</div>
            <div className="truncate text-sm text-muted-foreground">{song.artist}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {song.tuning && song.tuning !== "standard" && <span>{song.tuning}</span>}
              {song.capo_position > 0 && (
                <>
                  {song.tuning && song.tuning !== "standard" && <span>·</span>}
                  <span>Capo {song.capo_position}</span>
                </>
              )}
              {(song.target_bpm || song.spotify_bpm) && (
                <>
                  {(song.tuning && song.tuning !== "standard") || song.capo_position > 0 ? <span>·</span> : null}
                  <span>{song.target_bpm || song.spotify_bpm} BPM</span>
                </>
              )}
            </div>
          </div>
          {song.status === "learning" && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${song.progress_percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-primary">{song.progress_percent}%</span>
            </div>
          )}
          {song.difficulty && (
            <span className={`hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block ${difficultyColors[song.difficulty]}`}>
              {difficultyLabels[song.difficulty]}
            </span>
          )}
          <span className="material-symbols-outlined text-[18px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            chevron_right
          </span>
        </button>
      ))}
    </div>
  );
}

function PlaylistList({
  playlists,
  expandedPlaylist,
  onTogglePlaylist,
  onSongClick,
}: {
  playlists: PlaylistWithSongs[];
  expandedPlaylist: string | null;
  onTogglePlaylist: (id: string | null) => void;
  onSongClick: (song: Song) => void;
}) {
  if (playlists.length === 0) {
    return <EmptyState icon="queue_music" message="Pas de playlist" />;
  }

  return (
    <div className="space-y-3">
      {playlists.map((playlist) => (
        <div key={playlist.id} className="overflow-hidden rounded-xl border border-border/50 bg-card">
          <button
            onClick={() => onTogglePlaylist(expandedPlaylist === playlist.id ? null : playlist.id)}
            className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/30"
          >
            {playlist.cover_url ? (
              <Image src={playlist.cover_url} alt={playlist.name} className="h-12 w-12 rounded-lg object-cover"
                width={48}
                height={48}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-primary">queue_music</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{playlist.name}</div>
              <div className="text-sm text-muted-foreground">
                {playlist.song_count} morceau{playlist.song_count > 1 ? "x" : ""}
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-muted-foreground transition-transform ${
                expandedPlaylist === playlist.id ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          </button>

          {expandedPlaylist === playlist.id && playlist.songs.length > 0 && (
            <div className="border-t border-border bg-accent/20 p-2">
              {playlist.songs.map((song, index) => (
                <button
                  key={song.id}
                  onClick={() => onSongClick(song)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>
                  {song.cover_url ? (
                    <Image src={song.cover_url} alt={song.title} className="h-8 w-8 rounded object-cover"
                      width={32}
                      height={32}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      <span className="material-symbols-outlined text-sm text-muted-foreground">music_note</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{song.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[song.status]}`}>
                    {statusLabels[song.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlbumReviewList({ reviews }: { reviews: AlbumReview[] }) {
  if (reviews.length === 0) {
    return <EmptyState icon="album" message="Pas encore de review" />;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="overflow-hidden rounded-xl border border-border/50 bg-card">
          <div className="flex items-start gap-4 p-4">
            {review.cover_url ? (
              <Image
                src={review.cover_url}
                alt={review.album_name}
                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover shadow-sm"
                width={80}
                height={80}
              />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="material-symbols-outlined text-2xl text-muted-foreground">album</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="truncate font-bold">{review.album_name}</h5>
                  <p className="truncate text-sm text-muted-foreground">{review.artist_name}</p>
                </div>
                {/* Rating */}
                <div className="flex-shrink-0 rounded-xl bg-primary/10 px-3 py-1.5">
                  <span className="text-lg font-extrabold text-primary">{review.rating}</span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
              </div>
              {review.review && (
                <p className="mt-2 line-clamp-3 text-sm text-foreground/70">{review.review}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: PracticeSessionWithSong }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
      {session.song?.cover_url ? (
        <Image src={session.song.cover_url} alt={session.song.title} className="h-10 w-10 rounded-lg object-cover"
          width={40}
          height={40}
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <span className="material-symbols-outlined text-primary text-[18px]">headphones</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {session.song?.title || "Session libre"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatMinutes(session.duration_minutes)}</span>
          {session.bpm_achieved && (
            <>
              <span>·</span>
              <span>{session.bpm_achieved} BPM</span>
            </>
          )}
          <span>·</span>
          <span>{formatDateShort(session.practiced_at)}</span>
        </div>
      </div>
      {session.mood && (
        <span className="text-lg" title={moodLabels[session.mood]}>
          {moodEmojis[session.mood]}
        </span>
      )}
    </div>
  );
}

function CoverCard({ cover }: { cover: CoverWithSong }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="relative aspect-video bg-muted">
        {cover.media_type === "video" ? (
          cover.thumbnail_url ? (
            <img src={cover.thumbnail_url} alt={cover.song?.title} className="h-full w-full object-cover" />
          ) : (
            <video src={cover.media_url} className="h-full w-full object-cover" muted preload="metadata" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/10">
            <span className="material-symbols-outlined text-3xl text-primary/50">audiotrack</span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow">
            <svg className="ml-0.5 h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-medium">{cover.song?.title}</div>
        <div className="truncate text-xs text-muted-foreground">{cover.song?.artist}</div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-accent/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </div>
      <div className={`text-sm font-semibold ${valueClass ? `inline-block rounded-full px-2 py-0.5 text-xs ${valueClass}` : ""}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
      <span className="material-symbols-outlined mb-2 text-3xl text-muted-foreground/50">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
