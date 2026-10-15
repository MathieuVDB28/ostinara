"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Heart, Lock, X } from "lucide-react";
import type { CoverWithSong, PracticeSessionWithSong, PublicProfile, SessionMood, Song } from "@/types";
import { GEAR_TYPE_LABELS } from "@/types";
import { ProfileIdentity } from "./profile-identity";
import { ProfileShowcase } from "./profile-showcase";
import { FriendshipButton } from "@/components/friends/friendship-button";
import { SongShelf } from "@/components/library/song-shelf";
import { songProgress } from "@/components/library/song-card";
import { AddTrackToLibraryButton } from "@/components/albums/favorite-track-picker";
import { StarRating } from "@/components/ui/star-rating";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";

type Tab = "songs" | "albums" | "gear" | "activity";

const TABS: { key: Tab; label: string }[] = [
  { key: "songs", label: "Morceaux" },
  { key: "albums", label: "Albums" },
  { key: "gear", label: "Matos" },
  { key: "activity", label: "Activité" },
];

const STATUS_LABEL: Record<Song["status"], string> = {
  learning: "En cours",
  mastered: "Maîtrisé",
  want_to_learn: "À apprendre",
};

const MOOD_EMOJI: Record<SessionMood, string> = {
  frustrated: "😤",
  neutral: "😐",
  good: "🙂",
  great: "😎",
  on_fire: "🔥",
};

const SECTION_TITLE =
  "mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m}` : `${h} h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

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
export function PublicProfileView({ data }: { data: PublicProfile }) {
  const { profile } = data;
  const [tab, setTab] = useState<Tab>("songs");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const closeSong = useCallback(() => setSelectedSong(null), []);

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
        Amis
      </Link>

      <ProfileIdentity
        profile={profile}
        favoriteSongs={data.favorite_songs}
        favoriteAlbums={data.favorite_albums}
        showDetails={canView}
        stats={[
          { label: "Morceaux", value: data.stats.totalSongs ?? "—" },
          { label: "Maîtrisés", value: data.stats.masteredSongs ?? "—" },
          { label: "Covers", value: data.stats.totalCovers },
          { label: "Série", value: data.practice_stats ? `${data.practice_stats.currentStreak} j` : "—" },
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
          <h2 className="font-display text-2xl font-extrabold uppercase leading-none">Profil privé</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {data.friendship_status === "pending"
              ? `${name} n'a pas encore répondu à ta demande.`
              : `Deviens ami·e avec ${name} pour voir sa biblio, ses albums et son matos.`}
          </p>
        </div>
      ) : (
        <>
          <ProfileShowcase
            favoriteSongs={data.favorite_songs}
            favoriteAlbums={data.favorite_albums}
            favoriteGear={data.favorite_gear}
          />

          {/* Onglets locaux, style Atelier comme ceux du profil */}
          <div role="tablist" aria-label={`Profil de ${name}`} className="mb-5 flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none]">
            {TABS.map((item) => {
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
              <Empty>Pas encore de morceaux dans sa biblio.</Empty>
            ) : (
              <div className="flex flex-col gap-6">
                {shelves.map((shelf) => (
                  <section key={shelf.status} aria-label={STATUS_LABEL[shelf.status]}>
                    <h2 className="mb-2.5 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                      {STATUS_LABEL[shelf.status]} · {shelf.songs.length}
                    </h2>
                    <SongShelf songs={shelf.songs} bestBpm={{}} onSelect={setSelectedSong} />
                  </section>
                ))}
              </div>
            ))}

          {tab === "albums" &&
            (!data.album_reviews || data.album_reviews.length === 0 ? (
              <Empty>Pas encore d&apos;album noté.</Empty>
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
                          {review.favorite_track_name && (
                            <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="h-3 w-3 shrink-0 fill-primary text-primary" strokeWidth={0} aria-label="Morceau préféré" />
                              <span className="truncate">{review.favorite_track_name}</span>
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
                      {review.spotify_id ? (
                        <Link
                          href={`/albums/${review.spotify_id}`}
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
              <Empty>Pas de matos partagé.</Empty>
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
                        {GEAR_TYPE_LABELS[gear.type]}
                        {gear.year ? ` · ${gear.year}` : ""}
                      </p>
                    </div>
                    {gear.is_active && (
                      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-success">
                        Joue en ce moment
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}

          {tab === "activity" && <ActivityTab data={data} />}
        </>
      )}

      {selectedSong && (
        <FriendSongSheet
          song={selectedSong}
          covers={data.recent_covers.filter((cover) => cover.song_id === selectedSong.id)}
          ownerName={name}
          onClose={closeSong}
        />
      )}
    </div>
  );
}

function ActivityTab({ data }: { data: PublicProfile }) {
  const stats = data.practice_stats;
  const sessions = data.recent_sessions ?? [];
  const covers = data.recent_covers;

  if (!stats?.totalSessions && sessions.length === 0 && covers.length === 0) {
    return <Empty>Pas encore d&apos;activité.</Empty>;
  }

  return (
    <div className="flex flex-col gap-7">
      {stats && stats.totalSessions > 0 && (
        <dl className="grid grid-cols-3 border-y border-border py-2.5">
          {[
            { label: "Cette semaine", value: formatMinutes(stats.minutesThisWeek) },
            { label: "Au total", value: formatMinutes(stats.totalMinutes) },
            { label: "Sessions", value: String(stats.totalSessions) },
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

      {sessions.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE}>Dernières sessions</h2>
          <ul className="divide-y divide-border border-b border-border">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        </section>
      )}

      {covers.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE}>Covers récentes</h2>
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

function SessionRow({ session }: { session: PracticeSessionWithSong }) {
  const meta = [
    formatMinutes(session.duration_minutes),
    session.bpm_achieved ? `${session.bpm_achieved} BPM` : null,
    formatDate(session.practiced_at),
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Cover src={session.song?.cover_url} className="h-10 w-10 rounded-[4px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{session.song?.title || "Session libre"}</p>
        <p className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</p>
      </div>
      {session.mood && (
        <span className="text-lg" aria-label={session.mood}>
          {MOOD_EMOJI[session.mood]}
        </span>
      )}
    </li>
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
  onClose,
}: {
  song: Song;
  covers: CoverWithSong[];
  ownerName: string;
  onClose: () => void;
}) {
  const { tempo, percent } = songProgress(song);

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
              {STATUS_LABEL[song.status]} chez {ownerName}
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
            aria-label="Fermer"
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
              Voir sa tablature
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

          <AddTrackToLibraryButton
            title={song.title}
            artist={song.artist}
            album={song.album}
            coverUrl={song.cover_url}
            spotifyId={song.spotify_id}
          />
        </div>
      </div>
    </div>
  );
}
