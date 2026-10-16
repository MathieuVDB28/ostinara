"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  CirclePlus,
  GraduationCap,
  Guitar,
  Heart,
  ListMusic,
  Play,
  Star,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { BadgeMedal } from "@/components/badges/badge-medal";
import { badgeGoal, badgeLabel } from "@/lib/badges/catalog";
import { profileHref } from "@/lib/navigation";
import { ACTIVITY_MESSAGES, formatActivityDate } from "@/lib/activity-messages";
import type { ActivityWithDetails } from "@/types";
import { ActivityReactions } from "./activity-reactions";
import { ActivityComments } from "./activity-comments";
import { FeedBridge } from "./feed-bridge";
import { CoverGearLine } from "@/components/covers/cover-gear-line";

interface ActivityCardProps {
  activity: ActivityWithDetails;
  currentUserId: string;
}

/** Le repere des activites compactes, quand il n'y a pas d'image. */
const COMPACT_ICONS: Record<string, LucideIcon> = {
  song_added: CirclePlus,
  song_learning: GraduationCap,
  song_wishlisted: Star,
  album_wishlisted: Bookmark,
  friend_added: UserPlus,
  setlist_created: ListMusic,
  band_created: Users,
  band_joined: Users,
  gear_added: Guitar,
  challenge_created: Trophy,
  challenge_accepted: Trophy,
  challenge_completed: Trophy,
  challenge_won: Trophy,
};

const CHALLENGE_LABELS: Record<string, string> = {
  practice_time: "Défi temps de pratique",
  streak: "Défi série",
  song_mastery: "Défi maîtrise",
};

function Avatar({
  url,
  name,
  size = 32,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  return url ? (
    <Image
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary font-display font-extrabold text-muted-foreground"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

/**
 * Le grand format : une pochette plein cadre, le titre en capitales
 * condensees pose dessus comme une affiche (style Fanzine,
 * docs/refonte-ui.md). Reserve a ce qu'on vient montrer : un album
 * ecoute, une cover, un morceau maitrise.
 */
function Poster({
  src,
  eyebrow,
  title,
  subtitle,
  badge,
  aspect = "aspect-square",
}: {
  src?: string | null;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  aspect?: string;
}) {
  return (
    <Cover src={src} alt="" className={`w-full ${aspect} sm:rounded-md`}>
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/85" />
      {badge && <span className="absolute right-3 top-3">{badge}</span>}
      <span className="absolute inset-x-4 bottom-3.5 text-white">
        <span className="block font-display text-[11px] font-bold uppercase tracking-[0.08em] opacity-85">
          {eyebrow}
        </span>
        <span className="block text-balance font-display text-[40px] font-extrabold uppercase leading-[0.9] sm:text-5xl">
          {title}
        </span>
        {subtitle && (
          <span className="block font-display text-[13px] font-bold uppercase tracking-[0.06em] opacity-85">
            {subtitle}
          </span>
        )}
      </span>
    </Cover>
  );
}

/** Une activite courte : une ligne, l'image ou un repere, et le titre en condense. */
function Compact({
  src,
  type,
  label,
  title,
  round = false,
}: {
  src?: string | null;
  type: string;
  label: string;
  title: string;
  round?: boolean;
}) {
  const Icon = COMPACT_ICONS[type];
  return (
    <div className="flex items-center gap-3 px-4 sm:px-0">
      {src || !Icon ? (
        <Cover src={src} className={`h-14 w-14 ${round ? "rounded-full" : "rounded-[4px]"}`} />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-muted-foreground">
          <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">{title}</p>
      </div>
    </div>
  );
}

const pill =
  "flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-display text-[13px] font-bold tracking-[0.04em] text-white";

export function ActivityCard({ activity, currentUserId }: ActivityCardProps) {
  const isOwn = activity.user_id === currentUserId;
  const [playing, setPlaying] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const name = isOwn ? "Toi" : activity.user.display_name || activity.user.username;
  const meta = activity.metadata ?? {};

  return (
    <article className="border-b border-border pb-4">
      {/* Qui, quoi, quand */}
      <header className="flex items-center gap-2.5 px-4 py-3 sm:px-0">
        {/* Le nom et l'avatar menent au profil : c'est depuis le feed
            qu'on a envie de voir ce qu'un ami joue. */}
        <Link
          href={isOwn ? "/profil" : profileHref(activity.user.username)}
          aria-label={isOwn ? "Mon profil" : `Profil de ${name}`}
          className="shrink-0 rounded-full"
        >
          <Avatar url={activity.user.avatar_url} name={activity.user.display_name || activity.user.username} />
        </Link>
        <p className="min-w-0 flex-1 truncate text-[13px]">
          <Link
            href={isOwn ? "/profil" : profileHref(activity.user.username)}
            className="font-bold underline-offset-2 hover:underline"
          >
            {name}
          </Link>{" "}
          <span className="text-muted-foreground">{ACTIVITY_MESSAGES[activity.type]}</span>
        </p>
        <time dateTime={activity.created_at} className="shrink-0 text-xs text-muted-foreground">
          {formatActivityDate(activity.created_at)}
        </time>
      </header>

      {/* Grand format */}
      {activity.type === "album_reviewed" && activity.albumReview && (
        <>
          <Poster
            src={activity.albumReview.cover_url}
            eyebrow="Album"
            title={activity.albumReview.album_name}
            subtitle={activity.albumReview.artist_name}
            badge={
              <span className={pill}>
                <Star className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                {String(activity.albumReview.rating / 2).replace(".", ",")} / 5
              </span>
            }
          />
          {activity.albumReview.favorite_track_name && (
            <p className="flex items-center gap-1.5 px-4 pt-3 text-[13px] sm:px-0">
              <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" strokeWidth={0} aria-hidden="true" />
              <span className="text-muted-foreground">Préféré :</span>
              <span className="truncate font-semibold">{activity.albumReview.favorite_track_name}</span>
            </p>
          )}
          {activity.albumReview.review && (
            <div className="px-4 pt-3 sm:px-0">
              <p
                className={`font-serif text-[15px] italic leading-relaxed ${reviewOpen ? "" : "line-clamp-2"}`}
              >
                <span className="mr-1 font-sans text-[13px] font-bold not-italic">{name}</span>
                {activity.albumReview.review}
              </p>
              {activity.albumReview.review.length > 140 && (
                <button
                  type="button"
                  onClick={() => setReviewOpen((open) => !open)}
                  className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {reviewOpen ? "Réduire" : "Lire l'avis"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activity.type === "cover_posted" && activity.cover && (
        <div className="relative">
          {playing ? (
            <video
              src={activity.cover.media_url}
              className="aspect-video w-full bg-black sm:rounded-md"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Lire la cover de ${activity.cover.song.title}`}
              className="block w-full text-left"
            >
              <Poster
                src={activity.cover.thumbnail_url ?? activity.cover.song.cover_url}
                eyebrow="Cover"
                title={activity.cover.song.title}
                subtitle={activity.cover.song.artist}
                aspect="aspect-[16/10]"
                badge={
                  <span className={pill}>
                    <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                    Lire
                  </span>
                }
              />
            </button>
          )}
          <CoverGearLine gear={activity.cover.gear} className="px-4 pt-2.5 sm:px-0" />
        </div>
      )}

      {activity.type === "song_mastered" && activity.song && (
        <Poster
          src={activity.song.cover_url}
          eyebrow="Maîtrisé"
          title={activity.song.title}
          subtitle={activity.song.artist}
          aspect="aspect-[16/10]"
        />
      )}

      {/* Lignes compactes */}
      {(activity.type === "song_added" || activity.type === "song_learning") && activity.song && (
        <Compact src={activity.song.cover_url} type={activity.type} label={activity.song.artist} title={activity.song.title} />
      )}

      {activity.type === "song_wishlisted" && activity.wishlistSong && (
        <Compact
          src={activity.wishlistSong.cover_url}
          type={activity.type}
          label={activity.wishlistSong.artist}
          title={activity.wishlistSong.title}
        />
      )}

      {activity.type === "album_wishlisted" && activity.albumWishlistItem && (
        <Compact
          src={activity.albumWishlistItem.cover_url}
          type={activity.type}
          label={activity.albumWishlistItem.artist_name}
          title={activity.albumWishlistItem.album_name}
        />
      )}

      {activity.type === "friend_added" && activity.friend && (
        <div className="flex items-center gap-3 px-4 sm:px-0">
          <Avatar
            url={activity.friend.avatar_url}
            name={activity.friend.display_name || activity.friend.username}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">@{activity.friend.username}</p>
            <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">
              {activity.friend.display_name || activity.friend.username}
            </p>
          </div>
        </div>
      )}

      {activity.type === "setlist_created" && activity.metadata && (
        <Compact
          type={activity.type}
          label={meta.is_band ? "Setlist de groupe" : "Setlist personnelle"}
          title={String(meta.name ?? "Setlist")}
        />
      )}

      {(activity.type === "band_created" || activity.type === "band_joined") && activity.metadata && (
        <Compact
          type={activity.type}
          label={activity.type === "band_created" ? "Nouveau groupe" : "A rejoint le groupe"}
          title={String(meta.band_name ?? "Groupe")}
        />
      )}

      {activity.type === "gear_added" && activity.metadata && (
        <Compact
          src={meta.image_url ? String(meta.image_url) : null}
          type={activity.type}
          label={meta.type ? String(meta.type) : "Matériel"}
          title={`${String(meta.brand ?? "")} ${String(meta.model ?? "")}`.trim()}
        />
      )}

      {activity.type.startsWith("challenge_") && activity.metadata && (
        <Compact
          type={activity.type}
          label={meta.opponent_name ? `Contre ${String(meta.opponent_name)}` : "Défi"}
          title={CHALLENGE_LABELS[String(meta.challenge_type)] ?? "Défi"}
        />
      )}

      {activity.type === "badge_unlocked" && typeof meta.badge_id === "string" && (
        <div className="flex items-center gap-3 px-4 sm:px-0">
          <BadgeMedal badgeId={meta.badge_id} level={Number(meta.level) || 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {badgeGoal(meta.badge_id, Number(meta.level) || 1)}
            </p>
            <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">
              {badgeLabel(meta.badge_id, Number(meta.level) || 1)}
            </p>
          </div>
        </div>
      )}

      {/* Réactions et commentaires */}
      <div className="mt-3 flex flex-col gap-2.5 px-4 sm:px-0">
        {!isOwn && <FeedBridge activity={activity} friendName={name} />}
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
    </article>
  );
}
