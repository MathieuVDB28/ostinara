"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDuration } from "@/components/progress/stats-summary";
import { ChevronLeft, ExternalLink, Heart, Lock, X } from "lucide-react";
import type { ActivityWithDetails, CoverWithSong, Instrument, PublicProfile, Song } from "@/types";
import { getProfileSessions } from "@/lib/actions/activities";
import { ActivityCard } from "@/components/social/activity-card";
import { ProfileIdentity } from "./profile-identity";
import { ProfileShowcase } from "./profile-showcase";
import { FriendshipButton } from "@/components/friends/friendship-button";
import { SongShelf } from "@/components/library/song-shelf";
import { songProgress } from "@/components/library/song-card";
import { AddTracksToLibraryButton, libraryKey } from "@/components/albums/favorite-track-picker";
import { StarRating } from "@/components/ui/star-rating";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";
import { BadgeMedal } from "@/components/badges/badge-medal";
import { badgeLabel, type BadgeStatus } from "@/lib/badges/catalog";

type Tab = "songs" | "albums" | "gear" | "activity";

const TABS: Tab[] = ["songs", "albums", "gear", "activity"];

interface ProfileSessions {
  sessions: ActivityWithDetails[];
  hasMore: boolean;
}

const SECTION_TITLE =
  "mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

/**
 * Le profil d'un ami, en page.
 *
 * C'etait une modale ouverte depuis la seule liste d'amis : on ne pouvait
 * pas y arriver depuis le feed, ni partager son adresse, ni revenir en
 * arriere avec le geste du telephone. Meme en-tete et meme vitrine que
 * son propre profil ; en dessous, ce qu'on vient voir chez un ami.
 */
export function PublicProfileView({
  data,
  badges = [],
  librarySongIds = [],
  sessions,
  currentUserId,
}: {
  data: PublicProfile;
  badges?: BadgeStatus[];
  /** Ses morceaux deja dans ma biblio. */
  librarySongIds?: string[];
  /** Ses sessions partagees, premiere page. */
  sessions: ProfileSessions;
  currentUserId: string;
}) {
  const t = useTranslations("profile.public");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { profile } = data;
  const [tab, setTab] = useState<Tab>("songs");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const closeSong = useCallback(() => setSelectedSong(null), []);
  const [inMyLibrary, setInMyLibrary] = useState<ReadonlySet<string>>(() => new Set(librarySongIds));

  const canView = !profile.is_private || data.is_friend;
  const name = profile.display_name || profile.username;

  const songs = useMemo(() => data.all_songs ?? [], [data.all_songs]);
  const shelves = useMemo(
    () =>
      (["learning", "mastered", "want_to_learn"] as const)
        .map((status) => ({ status, songs: songs.filter((song) => song.status === status) }))
        .filter((shelf) => shelf.songs.length > 0),
    [songs]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/commu/amis"
        className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        {t("friends")}
      </Link>

      <ProfileIdentity
        profile={profile}
        favoriteSongs={data.favorite_songs}
        favoriteAlbums={data.favorite_albums}
        showDetails={canView}
        stats={[
          { label: t("songs"), value: data.stats.totalSongs ?? "—" },
          { label: t("mastered"), value: data.stats.masteredSongs ?? "—" },
          { label: t("covers"), value: data.stats.totalCovers },
          { label: t("streak"), value: data.practice_stats ? tc("duration.days", { d: data.practice_stats.currentStreak }) : "—" },
        ]}
        action={
          <FriendshipButton
            userId={profile.id}
            status={data.friendship_status}
            friendshipId={data.friendship_id}
            requestIncoming={data.request_incoming}
          />
        }
      />

      {!canView ? (
        <div className="flex flex-col items-center gap-2 border-b border-border py-12 text-center">
          <Lock className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t("private")}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {data.friendship_status === "pending"
              ? t("pending", { name })
              : t("befriend", { name })}
          </p>
        </div>
      ) : (
        <>
          <ProfileShowcase
            favoriteSongs={data.favorite_songs}
            favoriteAlbums={data.favorite_albums}
            favoriteGear={data.favorite_gear}
          />

          <FriendBadges badges={badges} instrument={profile.instruments?.find((i) => i.is_primary)?.instrument} />

          {/* Onglets locaux, style Atelier comme ceux du profil */}
          <div role="tablist" aria-label={t("tablist", { name })} className="mb-5 flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none]">
            {TABS.map((key) => ({ key, label: t(`tabs.${key}`) })).map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.key)}
                  className={`flex min-h-[40px] shrink-0 items-center pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                    active
                      ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab === "songs" &&
            (shelves.length === 0 ? (
              <Empty>{t("noSongs")}</Empty>
            ) : (
              <div className="flex flex-col gap-6">
                {shelves.map((shelf) => (
                  <section key={shelf.status} aria-label={te(`songStatus.${shelf.status}`)}>
                    <h2 className="mb-2.5 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                      {te(`songStatus.${shelf.status}`)} · {shelf.songs.length}
                    </h2>
                    <SongShelf songs={shelf.songs} bestBpm={{}} onSelect={setSelectedSong} />
                  </section>
                ))}
              </div>
            ))}

          {tab === "albums" &&
            (!data.album_reviews || data.album_reviews.length === 0 ? (
              <Empty>{t("noAlbums")}</Empty>
            ) : (
              <ul className="divide-y divide-border border-b border-border">
                {data.album_reviews.map((review) => {
                  const content = (
                    <>
                      <Cover src={review.cover_url} className="h-16 w-16 rounded-[4px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{review.album_name}</p>
                        <p className="truncate text-[13px] text-muted-foreground">{review.artist_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRating value={review.rating / 2} size="sm" />
                          {review.favorite_tracks?.length > 0 && (
                            <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="h-3 w-3 shrink-0 fill-primary text-primary" strokeWidth={0} aria-label={t("favoriteSong", { count: review.favorite_tracks.length })} />
                              <span className="truncate">{review.favorite_tracks.map((track) => track.name).join(", ")}</span>
                            </span>
                          )}
                        </div>
                        {review.review && (
                          <p className="mt-1.5 line-clamp-3 font-serif text-[14px] italic leading-snug text-foreground/80">
                            {review.review}
                          </p>
                        )}
                      </div>
                    </>
                  );
                  return (
                    <li key={review.id}>
                      {review.deezer_id ? (
                        <Link
                          href={`/albums/${review.deezer_id}`}
                          className="flex items-start gap-3.5 py-3 transition-colors hover:bg-accent/50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3.5 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === "gear" &&
            (!data.gear_items || data.gear_items.length === 0 ? (
              <Empty>{t("noGear")}</Empty>
            ) : (
              <ul className="divide-y divide-border border-b border-border">
                {data.gear_items.map((gear) => (
                  <li key={gear.id} className="flex items-center gap-3.5 py-3">
                    <Cover src={gear.image_url} className="h-14 w-14 rounded-[4px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {gear.brand} {gear.model}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {te(`gearType.${gear.type}`)}
                        {gear.year ? ` · ${gear.year}` : ""}
                      </p>
                    </div>
                    {gear.is_active && (
                      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-success">
                        {t("playingNow")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}

          {tab === "activity" && <ActivityTab data={data} sessions={sessions} currentUserId={currentUserId} />}
        </>
      )}

      {selectedSong && (
        <FriendSongSheet
          song={selectedSong}
          covers={data.recent_covers.filter((cover) => cover.song_id === selectedSong.id)}
          ownerName={name}
          inMyLibrary={inMyLibrary.has(selectedSong.id)}
          onAdded={() => setInMyLibrary((previous) => new Set([...previous, selectedSong.id]))}
          onClose={closeSong}
        />
      )}
    </div>
  );
}

function ActivityTab({
  data,
  sessions: initialSessions,
  currentUserId,
}: {
  data: PublicProfile;
  sessions: ProfileSessions;
  currentUserId: string;
}) {
  const t = useTranslations("profile.public");
  const tc = useTranslations("common");
  const stats = data.practice_stats;
  const covers = data.recent_covers;
  const [sessions, setSessions] = useState(initialSessions.sessions);
  const [hasMore, setHasMore] = useState(initialSessions.hasMore);
  const [loading, startLoading] = useTransition();

  const loadMore = () => {
    const last = sessions[sessions.length - 1];
    if (!last) return;
    startLoading(async () => {
      const next = await getProfileSessions(data.profile.id, last.created_at);
      setSessions((previous) => [...previous, ...next.sessions]);
      setHasMore(next.hasMore);
    });
  };

  if (!stats?.totalSessions && sessions.length === 0 && covers.length === 0) {
    return <Empty>{t("noActivity")}</Empty>;
  }

  return (
    <div className="flex flex-col gap-7">
      {stats && stats.totalSessions > 0 && (
        <dl className="grid grid-cols-3 border-y border-border py-2.5">
          {[
            { label: t("thisWeek"), value: formatDuration(stats.minutesThisWeek, tc) },
            { label: t("total"), value: formatDuration(stats.totalMinutes, tc) },
            { label: t("sessions"), value: String(stats.totalSessions) },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-0.5">
              <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="tabular font-display text-[24px] font-bold leading-none">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Les sessions en entier, comme dans le feed : morceaux et tempos,
          exercices, sections, objectif, note — et de quoi y reagir. */}
      {sessions.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE}>{t("lastSessions")}</h2>
          <div className="-mx-4 sm:mx-0">
            {sessions.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} currentUserId={currentUserId} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {loading ? t("loadingSessions") : t("moreSessions")}
            </button>
          )}
        </section>
      )}

      {covers.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE}>{t("recentCovers")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {covers.slice(0, 6).map((cover) => (
              <CoverTile key={cover.id} cover={cover} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CoverTile({ cover }: { cover: CoverWithSong }) {
  return (
    <figure className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-[4px] bg-muted">
        {cover.media_type === "video" ? (
          <video src={cover.media_url} className="h-full w-full object-cover" controls preload="metadata" />
        ) : (
          <div className="flex h-full items-center justify-center px-2">
            <audio src={cover.media_url} controls preload="metadata" className="w-full" />
          </div>
        )}
      </div>
      <figcaption className="mt-1.5">
        <p className="truncate text-xs font-semibold">{cover.song?.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{cover.song?.artist}</p>
      </figcaption>
    </figure>
  );
}

/**
 * La fiche d'un morceau d'ami : ou il en est, comment il le joue, ses
 * covers — et de quoi l'ajouter a sa propre biblio.
 */
function FriendSongSheet({
  song,
  covers,
  ownerName,
  inMyLibrary,
  onAdded,
  onClose,
}: {
  song: Song;
  covers: CoverWithSong[];
  ownerName: string;
  inMyLibrary: boolean;
  onAdded: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("profile.public");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { tempo, percent } = songProgress(song);
  const track = { name: song.title, deezer_id: song.deezer_id ?? undefined };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const meta = [
    song.tuning,
    tempo ? `${tempo.target} BPM` : null,
    song.capo_position > 0 ? `Capo ${song.capo_position}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-song-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card sm:rounded-2xl"
      >
        <div className="flex items-start gap-4 border-b border-border p-5">
          <Cover src={song.cover_url} className="h-20 w-20 rounded-[4px]" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("statusAt", { status: te(`songStatus.${song.status}`), name: ownerName })}
            </p>
            <h2 id="friend-song-title" className="mt-0.5 truncate text-lg font-bold">
              {song.title}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
            {song.status === "learning" && (
              <Frets value={percent} label={`${percent} %`} className="mt-2" />
            )}
          </div>
          <button
            type="button"
            aria-label={tc("close")}
            onClick={onClose}
            className="-m-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {meta.length > 0 && <p className="mb-4 text-sm text-muted-foreground">{meta.join(" · ")}</p>}

          {song.notes && (
            <p className="mb-4 whitespace-pre-wrap font-serif text-[15px] italic leading-relaxed">{song.notes}</p>
          )}

          {song.tabs_url && (
            <a
              href={song.tabs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex min-h-[44px] items-center gap-2 border-y border-border text-sm font-semibold transition-colors hover:bg-accent/50"
            >
              {t("seeTab")}
              <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </a>
          )}

          {covers.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              {covers.map((cover) => (
                <CoverTile key={cover.id} cover={cover} />
              ))}
            </div>
          )}

          <AddTracksToLibraryButton
            tracks={[track]}
            artist={song.artist}
            album={song.album}
            coverUrl={song.cover_url}
            inLibrary={inMyLibrary ? new Set([libraryKey(track)]) : undefined}
            onAdded={onAdded}
          />
        </div>
      </div>
    </div>
  );
}

/** Les badges obtenus, en un rang de medailles. Rien quand il n'y en a pas. */
function FriendBadges({ badges, instrument }: { badges: BadgeStatus[]; instrument?: Instrument }) {
  const t = useTranslations("profile.public");
  const tb = useTranslations("badges");
  const unlocked = badges
    .filter((badge) => badge.level > 0)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));

  if (unlocked.length === 0) return null;

  return (
    <section aria-labelledby="friend-badges" className="mb-6">
      <h2
        id="friend-badges"
        className="mb-3 border-b border-border pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {t("badges", { count: unlocked.length })}
      </h2>
      <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {unlocked.map((badge) => (
          <li key={badge.id} className="flex w-[72px] shrink-0 flex-col items-center gap-1 text-center">
            <BadgeMedal badgeId={badge.id} level={badge.level} count={badge.count} />
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
              {badgeLabel(badge.id, badge.level, instrument, tb)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
