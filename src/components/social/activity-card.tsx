"use client";

import Image from "next/image";
import { useState } from "react";
import type { ActivityWithDetails } from "@/types";
import { ActivityReactions } from "./activity-reactions";
import { ActivityComments } from "./activity-comments";

interface ActivityCardProps {
  activity: ActivityWithDetails;
  currentUserId: string;
}

const activityMessages: Record<string, string> = {
  song_added: "a ajout\u00e9 un nouveau morceau",
  song_mastered: "a ma\u00eetris\u00e9 un morceau",
  cover_posted: "a post\u00e9 une cover",
  friend_added: "a un nouvel ami",
  song_wishlisted: "veut apprendre",
  setlist_created: "a cr\u00e9\u00e9 une setlist",
  band_created: "a cr\u00e9\u00e9 un groupe",
  band_joined: "a rejoint un groupe",
  challenge_created: "a lanc\u00e9 un d\u00e9fi",
  challenge_accepted: "a accept\u00e9 un d\u00e9fi",
  challenge_completed: "a termin\u00e9 un d\u00e9fi",
  challenge_won: "a remport\u00e9 un d\u00e9fi !",
  album_reviewed: "a \u00e9cout\u00e9 un album",
  album_wishlisted: "veut \u00e9couter un album",
  gear_added: "a ajout\u00e9 du matos \u00e0 sa collection",
};

const activityIcons: Record<string, string> = {
  song_added: "add_circle",
  song_mastered: "check_circle",
  cover_posted: "videocam",
  friend_added: "person_add",
  song_wishlisted: "star",
  setlist_created: "playlist_add",
  band_created: "groups",
  band_joined: "groups",
  challenge_created: "emoji_events",
  challenge_accepted: "emoji_events",
  challenge_completed: "emoji_events",
  challenge_won: "emoji_events",
  album_reviewed: "album",
  album_wishlisted: "bookmark",
  gear_added: "guitar",
};

function GuitarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="17" r="1.5"/>
    </svg>
  );
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "gear_added") {
    return <GuitarIcon className="h-5 w-5" />;
  }
  const icon = activityIcons[type];
  if (!icon) return null;
  return (
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
  );
}

export function ActivityCard({ activity, currentUserId }: ActivityCardProps) {
  const isOwn = activity.user_id === currentUserId;
  const [playing, setPlaying] = useState(false);

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
    <div className={`rounded-xl border p-5 ${
      isOwn
        ? "border-primary/20 bg-primary/[0.03]"
        : "border-border bg-card"
    }`}>
      {/* Header with user info */}
      <div className="mb-3 flex items-center gap-3">
        {/* Avatar */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
          isOwn ? "bg-primary/20 text-primary ring-2 ring-primary/30" : "bg-primary/10 text-primary"
        }`}>
          {activity.user.avatar_url ? (
            <Image
              src={activity.user.avatar_url}
              alt={activity.user.username}
              className="h-12 w-12 rounded-full object-cover"
              width={48}
              height={48}
            />
          ) : (
            activity.user.display_name?.[0]?.toUpperCase() ||
            activity.user.username[0].toUpperCase()
          )}
        </div>

        {/* Icon + username + action */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center text-muted-foreground">
              <ActivityIcon type={activity.type} />
            </span>
            <span className="font-semibold">
              {isOwn ? "Toi" : (activity.user.display_name || activity.user.username)}
            </span>
            <span className="text-muted-foreground">
              {activityMessages[activity.type]}
            </span>
          </div>
        </div>

        {/* Date */}
        <span className="ml-auto shrink-0 text-sm text-muted-foreground">
          {formatDate(activity.created_at)}
        </span>
      </div>

      {/* Activity content based on type */}
      {(activity.type === "song_added" || activity.type === "song_mastered") && activity.song && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          {activity.song.cover_url ? (
            <Image
              src={activity.song.cover_url}
              alt={activity.song.title}
              className="h-16 w-16 rounded-lg object-cover"
              width={64}
              height={64}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <span className="material-symbols-outlined text-2xl text-muted-foreground">music_note</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{activity.song.title}</div>
            <div className="truncate text-sm text-muted-foreground">{activity.song.artist}</div>
          </div>
          {activity.type === "song_mastered" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20 text-success">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
          )}
        </div>
      )}

      {activity.type === "cover_posted" && activity.cover && (
        <div className="overflow-hidden rounded-xl bg-accent/30">
          <div className="relative aspect-video bg-muted">
            {playing ? (
              <video
                src={activity.cover.media_url}
                className="h-full w-full"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <button
                type="button"
                className="block h-full w-full cursor-pointer"
                onClick={() => setPlaying(true)}
              >
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
                    playsInline
                    preload="metadata"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition-transform hover:scale-110">
                    <span className="material-symbols-outlined text-3xl">play_arrow</span>
                  </div>
                </div>
              </button>
            )}
          </div>
          <div className="p-3">
            <div className="font-semibold">{activity.cover.song.title}</div>
            <div className="text-sm text-muted-foreground">{activity.cover.song.artist}</div>
          </div>
        </div>
      )}

      {activity.type === "friend_added" && activity.friend && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {activity.friend.avatar_url ? (
              <Image
                src={activity.friend.avatar_url}
                alt={activity.friend.username}
                className="h-12 w-12 rounded-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              activity.friend.display_name?.[0]?.toUpperCase() ||
              activity.friend.username[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">
              {activity.friend.display_name || activity.friend.username}
            </div>
            <div className="truncate text-sm text-muted-foreground">@{activity.friend.username}</div>
          </div>
        </div>
      )}

      {activity.type === "song_wishlisted" && activity.wishlistSong && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          {activity.wishlistSong.cover_url ? (
            <Image
              src={activity.wishlistSong.cover_url}
              alt={activity.wishlistSong.title}
              className="h-16 w-16 rounded-lg object-cover"
              width={64}
              height={64}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <span className="material-symbols-outlined text-2xl text-muted-foreground">music_note</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{activity.wishlistSong.title}</div>
            <div className="truncate text-sm text-muted-foreground">{activity.wishlistSong.artist}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-outlined text-[18px]">star</span>
          </div>
        </div>
      )}

      {activity.type === "setlist_created" && activity.metadata && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <span className="material-symbols-outlined text-3xl">playlist_add</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{activity.metadata.name as string}</div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.metadata.is_band ? "Setlist de groupe" : "Setlist personnelle"}
            </div>
          </div>
        </div>
      )}

      {(activity.type === "band_created" || activity.type === "band_joined") && activity.metadata && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <span className="material-symbols-outlined text-3xl">groups</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{activity.metadata.band_name as string}</div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.type === "band_created" ? "Nouveau groupe" : "A rejoint le groupe"}
            </div>
          </div>
        </div>
      )}

      {activity.type === "album_reviewed" && activity.albumReview && (
        <div className="overflow-hidden rounded-xl bg-accent/30">
          <div className="flex items-center gap-3 p-3">
            {activity.albumReview.cover_url ? (
              <Image
                src={activity.albumReview.cover_url}
                alt={activity.albumReview.album_name}
                className="h-20 w-20 rounded-lg object-cover"
                width={80}
                height={80}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">album</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{activity.albumReview.album_name}</div>
              <div className="truncate text-sm text-muted-foreground">{activity.albumReview.artist_name}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined text-[14px]">star</span>
                  {activity.albumReview.rating / 2} / 5
                </div>
              </div>
            </div>
          </div>
          {activity.albumReview.review && (
            <div className="border-t border-border/50 px-3 py-2.5">
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                &ldquo;{activity.albumReview.review}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {activity.type === "album_wishlisted" && activity.albumWishlistItem && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          {activity.albumWishlistItem.cover_url ? (
            <Image
              src={activity.albumWishlistItem.cover_url}
              alt={activity.albumWishlistItem.album_name}
              className="h-16 w-16 rounded-lg object-cover"
              width={64}
              height={64}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">album</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{activity.albumWishlistItem.album_name}</div>
            <div className="truncate text-sm text-muted-foreground">{activity.albumWishlistItem.artist_name}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-outlined text-[18px]">bookmark</span>
          </div>
        </div>
      )}

      {activity.type === "gear_added" && activity.metadata && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 p-3">
          {activity.metadata.image_url ? (
            <img
              src={String(activity.metadata.image_url)}
              alt={`${activity.metadata.brand} ${activity.metadata.model}`}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="17" r="1.5"/>
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{String(activity.metadata.brand)} {String(activity.metadata.model)}</div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.metadata.type ? String(activity.metadata.type) : "Matériel"}
            </div>
          </div>
        </div>
      )}

      {activity.type.startsWith("challenge_") && activity.metadata && (
        <div className={`flex items-center gap-3 rounded-xl p-3 ${
          activity.type === "challenge_won"
            ? "bg-primary/10"
            : "bg-accent/30"
        }`}>
          <div className={`flex h-16 w-16 items-center justify-center rounded-lg ${
            activity.type === "challenge_won"
              ? "bg-primary/20 text-primary"
              : "bg-primary/20 text-primary"
          }`}>
            <span className="material-symbols-outlined text-3xl">emoji_events</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">
              {activity.metadata.challenge_type === "practice_time" && "Defi temps de pratique"}
              {activity.metadata.challenge_type === "streak" && "Defi streak"}
              {activity.metadata.challenge_type === "song_mastery" && "Defi maitrise"}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {activity.metadata.opponent_name ? `Contre ${String(activity.metadata.opponent_name)}` : null}
            </div>
          </div>
          {activity.type === "challenge_won" && (
            <span className="text-2xl">🏆</span>
          )}
        </div>
      )}

      {/* Réactions et commentaires */}
      <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
        <ActivityReactions
          activityId={activity.id}
          reactions={activity.reactions || []}
          currentUserReactions={activity.currentUserReactions || []}
        />
        <ActivityComments
          activityId={activity.id}
          commentCount={activity.commentCount || 0}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
