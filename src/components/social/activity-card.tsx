"use client";

import { instrumentPhrase } from "@/lib/instruments";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  CirclePlus,
  Dumbbell,
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
import { activityMessage, formatActivityDate } from "@/lib/activity-messages";
import { MOOD_EMOJI } from "@/components/progress/mood-selector";
import type { ActivityWithDetails, GearType, Instrument, SessionActivityMetadata, SessionMood } from "@/types";
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
  gear_wishlisted: Bookmark,
  challenge_created: Trophy,
  challenge_accepted: Trophy,
  challenge_completed: Trophy,
  challenge_won: Trophy,
};

const CHALLENGE_TYPES = ["practice_time", "streak", "song_mastery"] as const;
type ChallengeTypeKey = (typeof CHALLENGE_TYPES)[number];
const isChallengeType = (value: unknown): value is ChallengeTypeKey =>
  (CHALLENGE_TYPES as readonly unknown[]).includes(value);

export function Avatar({
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

/** Texte coupe a 2 lignes, « Lire » des qu'il deborde vraiment (la largeur
 * de l'ecran decide, pas un nombre de caracteres). */
function ClampedQuote({
  name,
  text,
  moreLabel,
  lessLabel,
  className,
}: {
  name: string;
  text: string;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    document.fonts?.ready.then(check);
    return () => observer.disconnect();
  }, [open, text]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className={`whitespace-pre-line break-words font-serif text-[15px] italic leading-relaxed ${open ? "" : "line-clamp-2"}`}
      >
        <span className="mr-1 font-sans text-[13px] font-bold not-italic">{name}</span>
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {open ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}

const pill =
  "flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-display text-[13px] font-bold tracking-[0.04em] text-white";

export function ActivityCard({ activity, currentUserId }: ActivityCardProps) {
  const t = useTranslations("activity");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const tb = useTranslations("badges");
  const intlLocale = useIntlLocale();
  const isOwn = activity.user_id === currentUserId;
  const [playing, setPlaying] = useState(false);
  const name = isOwn ? t("you") : activity.user.display_name || activity.user.username;
  const message = activityMessage(activity.type, t, isOwn);
  const meta = activity.metadata ?? {};
  const phrase = instrumentPhrase(meta.instrument, te);

  return (
    <article className="border-b border-border pb-4">
      {/* Qui, quoi, quand */}
      <header className="flex items-center gap-2.5 px-4 py-3 sm:px-0">
        {/* Le nom et l'avatar menent au profil : c'est depuis le feed
            qu'on a envie de voir ce qu'un ami joue. */}
        <Link
          href={isOwn ? "/profil" : profileHref(activity.user.username)}
          aria-label={isOwn ? t("myProfile") : t("profileOf", { name })}
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
          <span className="text-muted-foreground">{message}</span>
        </p>
        <time dateTime={activity.created_at} className="shrink-0 text-xs text-muted-foreground">
          {formatActivityDate(activity.created_at, tc, intlLocale)}
        </time>
      </header>

      {/* Grand format */}
      {activity.type === "album_reviewed" && activity.albumReview && (
        <>
          <Poster
            src={activity.albumReview.cover_url}
            eyebrow={t("album")}
            title={activity.albumReview.album_name}
            subtitle={activity.albumReview.artist_name}
            badge={
              <span className={pill}>
                <Star className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                {t("rating", { rating: (activity.albumReview.rating / 2).toLocaleString(intlLocale) })}
              </span>
            }
          />
          {activity.albumReview.favorite_tracks?.length > 0 && (
            <p className="flex items-center gap-1.5 px-4 pt-3 text-[13px] sm:px-0">
              <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" strokeWidth={0} aria-hidden="true" />
              <span className="shrink-0 text-muted-foreground">{t("favorite", { count: activity.albumReview.favorite_tracks.length })}</span>
              <span className="truncate font-semibold">
                {activity.albumReview.favorite_tracks.map((track) => track.name).join(", ")}
              </span>
            </p>
          )}
          {activity.albumReview.review && (
            <ClampedQuote
              className="px-4 pt-3 sm:px-0"
              name={name}
              text={activity.albumReview.review}
              moreLabel={t("readReview")}
              lessLabel={t("collapse")}
            />
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
              aria-label={t("playCover", { title: activity.cover.song.title })}
              className="block w-full text-left"
            >
              <Poster
                src={activity.cover.thumbnail_url ?? activity.cover.song.cover_url}
                eyebrow={t("cover")}
                title={activity.cover.song.title}
                subtitle={activity.cover.song.artist}
                aspect="aspect-[16/10]"
                badge={
                  <span className={pill}>
                    <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                    {t("play")}
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
          eyebrow={t("mastered", { instrument: phrase ? ` ${phrase}` : "" })}
          title={activity.song.title}
          subtitle={activity.song.artist}
          aspect="aspect-[16/10]"
        />
      )}

      {/* Lignes compactes */}
      {(activity.type === "song_added" || activity.type === "song_learning") && activity.song && (
        <Compact
          src={activity.song.cover_url}
          type={activity.type}
          label={
            activity.type === "song_learning" && phrase
              ? `${activity.song.artist} · ${phrase}`
              : activity.song.artist
          }
          title={activity.song.title}
        />
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
          label={meta.is_band ? t("bandSetlist") : t("personalSetlist")}
          title={String(meta.name ?? t("setlist"))}
        />
      )}

      {(activity.type === "band_created" || activity.type === "band_joined") && activity.metadata && (
        <Compact
          type={activity.type}
          label={activity.type === "band_created" ? t("newBand") : t("joinedBand")}
          title={String(meta.band_name ?? t("band"))}
        />
      )}

      {activity.type === "gear_wishlisted" && activity.metadata && (
        <Compact
          src={meta.image_url ? String(meta.image_url) : null}
          type={activity.type}
          label={meta.type ? t("gearWish", { type: te(`gearType.${String(meta.type) as GearType}`) }) : t("gear")}
          title={`${String(meta.brand ?? "")} ${String(meta.model ?? "")}`.trim()}
        />
      )}

      {activity.type === "gear_added" && activity.metadata && (
        <Compact
          src={meta.image_url ? String(meta.image_url) : null}
          type={activity.type}
          label={meta.type ? te(`gearType.${String(meta.type) as GearType}`) : t("gear")}
          title={`${String(meta.brand ?? "")} ${String(meta.model ?? "")}`.trim()}
        />
      )}

      {activity.type.startsWith("challenge_") && activity.metadata && (
        <Compact
          type={activity.type}
          label={meta.opponent_name ? t("against", { name: String(meta.opponent_name) }) : t("challengeFallback")}
          title={isChallengeType(meta.challenge_type) ? t(`challenge.${meta.challenge_type}`) : t("challengeFallback")}
        />
      )}

      {activity.type === "badge_unlocked" && typeof meta.badge_id === "string" && (
        <div className="flex items-center gap-3 px-4 sm:px-0">
          <BadgeMedal badgeId={meta.badge_id} level={Number(meta.level) || 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {badgeGoal(meta.badge_id, Number(meta.level) || 1, tb)}
            </p>
            <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">
              {badgeLabel(meta.badge_id, Number(meta.level) || 1, meta.instrument as Instrument | undefined, tb)}
            </p>
          </div>
        </div>
      )}

      {activity.type === "session_completed" && typeof meta.duration_minutes === "number" && (
        <SessionBlock
          session={meta as unknown as SessionActivityMetadata}
          createdAt={activity.created_at}
          name={name}
        />
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

/** Au-dela, la session a ete ajoutee apres coup : on dit quand elle a eu lieu. */
const SESSION_PAST_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * Une session jouee, telle que les amis la voient : la duree en grand
 * (style Atelier, docs/refonte-ui.md), l'humeur, les morceaux avec leur
 * tempo, et la note du musicien en serif — c'est sa voix.
 */
function SessionBlock({
  session,
  createdAt,
  name,
}: {
  session: SessionActivityMetadata;
  createdAt: string;
  name: string;
}) {
  const t = useTranslations("activity.sessionCard");
  const ta = useTranslations("activity");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();

  const phrase = instrumentPhrase(session.instrument, te);
  const instrument = phrase ? ` ${phrase}` : "";
  const practicedAt = Date.parse(session.practiced_at);
  const past = Number.isFinite(practicedAt) && Date.parse(createdAt) - practicedAt > SESSION_PAST_AFTER_MS;
  const eyebrow = past
    ? t("sessionOn", {
        date: new Date(practicedAt).toLocaleDateString(intlLocale, { weekday: "long", day: "numeric", month: "short" }),
        instrument,
      })
    : t("session", { instrument });

  const hours = Math.floor(session.duration_minutes / 60);
  const minutes = session.duration_minutes % 60;
  const mood = session.mood && session.mood in MOOD_EMOJI ? (session.mood as SessionMood) : null;
  const songs = Array.isArray(session.songs) ? session.songs : [];
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  const itemCount = songs.length + exercises.length;
  const sections = Array.isArray(session.sections_worked) ? session.sections_worked : [];

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-end gap-4 border-y border-border py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
          <p className="tabular font-display text-5xl font-extrabold leading-none">
            {hours > 0 && (
              <>
                {hours}
                <small className="text-[0.45em] text-muted-foreground"> {t("hours")} </small>
              </>
            )}
            {(hours === 0 || minutes > 0) && (
              <>
                {hours > 0 ? String(minutes).padStart(2, "0") : minutes}
                <small className="text-[0.45em] text-muted-foreground"> {t("minutes")}</small>
              </>
            )}
          </p>
        </div>
        {mood && (
          <span role="img" aria-label={t("moodLabel", { mood: te(`mood.${mood}`) })} className="text-4xl leading-none">
            {MOOD_EMOJI[mood]}
          </span>
        )}
      </div>

      {songs.length > 0 && (
        <ul>
          {songs.map((song) => (
            <li
              key={song.id}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5"
            >
              <Cover src={song.cover_url} className="h-11 w-11 rounded-[3px]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {song.artist}
                  {itemCount > 1 ? ` · ${t("songMinutes", { minutes: song.minutes })}` : ""}
                </p>
              </div>
              {song.bpm ? (
                <span className="tabular font-display text-lg font-bold leading-none">
                  {song.bpm}
                  <small className="text-xs font-semibold text-muted-foreground"> {t("bpm")}</small>
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}

      {exercises.length > 0 && (
        <ul>
          {exercises.map((exercise, index) => (
            <li
              key={`${exercise.id ?? exercise.name}-${index}`}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-secondary text-muted-foreground">
                <Dumbbell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{exercise.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {exercise.category ? te(`exerciseCategory.${exercise.category}`) : t("exercise")}
                  {itemCount > 1 ? ` · ${t("songMinutes", { minutes: exercise.minutes })}` : ""}
                </p>
              </div>
              {exercise.bpm ? (
                <span className="tabular font-display text-lg font-bold leading-none">
                  {exercise.bpm}
                  <small className="text-xs font-semibold text-muted-foreground"> {t("bpm")}</small>
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}

      {(sections.length > 0 || session.session_goals) && (
        <dl className="mt-3 space-y-1 text-[13px]">
          {sections.length > 0 && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted-foreground">{t("sections")}</dt>
              <dd className="min-w-0 font-semibold">{sections.map((section) => te(`section.${section}`)).join(" · ")}</dd>
            </div>
          )}
          {session.session_goals && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted-foreground">{t("goal")}</dt>
              <dd className="min-w-0 font-semibold">
                {session.session_goals}
                {session.goals_achieved && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    {t("goalReached")}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}

      {session.notes && (
        <ClampedQuote
          className="pt-3"
          name={name}
          text={session.notes}
          moreLabel={t("readNote")}
          lessLabel={ta("collapse")}
        />
      )}
    </div>
  );
}
