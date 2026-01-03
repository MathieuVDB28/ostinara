"use client";

import type { ActivityWithDetails } from "@/types";

interface ActivityCardProps {
  activity: ActivityWithDetails;
}

const activityMessages: Record<string, string> = {
  song_added: "a ajouté un nouveau morceau",
  song_mastered: "a maîtrisé un morceau",
  cover_posted: "a posté une cover",
  friend_added: "a un nouvel ami",
  song_wishlisted: "veut apprendre",
  setlist_created: "a créé une setlist",
  band_created: "a créé un groupe",
  band_joined: "a rejoint un groupe",
};

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "song_added":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      );
    case "song_mastered":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "cover_posted":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case "friend_added":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      );
    case "song_wishlisted":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case "setlist_created":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path strokeLinecap="round" d="M9 12h6M9 16h4"/>
        </svg>
      );
    case "band_created":
    case "band_joined":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header with user info */}
      <div className="mb-3 flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
          {activity.user.avatar_url ? (
            <img
              src={activity.user.avatar_url}
              alt={activity.user.username}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            activity.user.display_name?.[0]?.toUpperCase() ||
            activity.user.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-semibold">
              {activity.user.display_name || activity.user.username}
            </span>
            <span className="text-muted-foreground">
              {activityMessages[activity.type]}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(activity.created_at)}
          </div>
        </div>

        {/* Activity type icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground">
          <ActivityIcon type={activity.type} />
        </div>
      </div>

      {/* Activity content based on type */}
      {(activity.type === "song_added" || activity.type === "song_mastered") && activity.song && (
        <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
          {activity.song.cover_url ? (
            <img
              src={activity.song.cover_url}
              alt={activity.song.title}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{activity.song.title}</div>
            <div className="truncate text-sm text-muted-foreground">{activity.song.artist}</div>
          </div>
          {activity.type === "song_mastered" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      )}

      {activity.type === "cover_posted" && activity.cover && (
        <div className="overflow-hidden rounded-lg bg-accent/50">
          <div className="relative aspect-video bg-muted">
            {activity.cover.thumbnail_url ? (
              <img
                src={activity.cover.thumbnail_url}
                alt={`Cover de ${activity.cover.song.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={activity.cover.media_url}
                className="h-full w-full object-cover"
                muted
                preload="metadata"
              />
            )}
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition-transform hover:scale-110">
                <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="font-medium">{activity.cover.song.title}</div>
            <div className="text-sm text-muted-foreground">{activity.cover.song.artist}</div>
          </div>
        </div>
      )}

      {activity.type === "friend_added" && activity.friend && (
        <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {activity.friend.avatar_url ? (
              <img
                src={activity.friend.avatar_url}
                alt={activity.friend.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              activity.friend.display_name?.[0]?.toUpperCase() ||
              activity.friend.username[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {activity.friend.display_name || activity.friend.username}
            </div>
            <div className="truncate text-sm text-muted-foreground">@{activity.friend.username}</div>
          </div>
        </div>
      )}

      {activity.type === "song_wishlisted" && activity.wishlistSong && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 p-3">
          {activity.wishlistSong.cover_url ? (
            <img
              src={activity.wishlistSong.cover_url}
              alt={activity.wishlistSong.title}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{activity.wishlistSong.title}</div>
            <div className="truncate text-sm text-muted-foreground">{activity.wishlistSong.artist}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
      )}

      {activity.type === "setlist_created" && activity.metadata && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path strokeLinecap="round" d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{activity.metadata.name as string}</div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.metadata.is_band ? "Setlist de groupe" : "Setlist personnelle"}
            </div>
          </div>
        </div>
      )}

      {(activity.type === "band_created" || activity.type === "band_joined") && activity.metadata && (
        <div className="flex items-center gap-3 rounded-lg bg-purple-500/10 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{activity.metadata.band_name as string}</div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.type === "band_created" ? "Nouveau groupe" : "A rejoint le groupe"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
