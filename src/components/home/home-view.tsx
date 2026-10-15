import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Play, Search, Star, Trophy, UserPlus, Users } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";
import { songTempoProgress } from "@/lib/song-progress";
import { profileHref } from "@/lib/navigation";
import { ACTIVITY_MESSAGES, formatActivityDate } from "@/lib/activity-messages";
import { BADGES_BY_ID, badgeLabel, type BadgeStatus } from "@/lib/badges/catalog";
import { BadgeMedal } from "@/components/badges/badge-medal";
import type {
  ActivityWithDetails,
  AlbumReview,
  CoverFeedItem,
  PracticeSessionWithSong,
  PracticeStats,
  Song,
  WeeklyAlbum,
  WeeklyPlan,
} from "@/types";

interface HomeViewProps {
  displayName: string | null;
  practiceStats: PracticeStats;
  weeklyPlan: WeeklyPlan | null;
  resume: {
    song: Song;
    bestBpm: number | null;
    /** La derniere session, quand elle portait sur ce morceau. */
    lastSession: PracticeSessionWithSong | null;
  } | null;
  pending: { friends: number; challenges: number; bands: number };
  recentSongs: Song[];
  recentAlbums: AlbumReview[];
  weeklyAlbums: WeeklyAlbum[];
  friendActivities: ActivityWithDetails[];
  friendCovers: CoverFeedItem[];
  badges: BadgeStatus[];
}

/**
 * L'accueil, dans les styles de chaque domaine (docs/refonte-ui.md) :
 * ta semaine en Atelier (chiffres condenses, filets), tes ajouts en
 * Etagere (pochettes), la communaute en Fanzine (pochettes plein cadre,
 * capitales condensees).
 *
 * Sur ordi, ce qui te concerne a gauche, les autres a droite. Sur mobile,
 * le meme ordre empile : on lit d'abord sa propre semaine.
 */
export function HomeView({
  displayName,
  practiceStats,
  weeklyPlan,
  resume,
  pending,
  recentSongs,
  recentAlbums,
  weeklyAlbums,
  friendActivities,
  friendCovers,
  badges,
}: HomeViewProps) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {today}
          </p>
          <h1 className="mt-1 truncate font-display text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] lg:text-5xl">
            {displayName ? `Salut ${displayName}` : "Salut"}
          </h1>
        </div>
        {/*
          La recherche a quitte la pilule du bas pour laisser sa place a
          l'accueil : elle s'ouvre d'ici. Sur ordi, cmd-K et la sidebar
          s'en chargent.
        */}
        <Link
          href="/recherche"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">Rechercher</span>
        </Link>
      </header>

      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <WeekStats stats={practiceStats} plan={weeklyPlan} />
          <ResumeBlock resume={resume} />
          <PendingBlock pending={pending} />
          <BadgesBlock badges={badges} />
          <RecentSongsShelf songs={recentSongs} />
          <RecentAlbumsShelf albums={recentAlbums} />
        </div>

        <div className="min-w-0 space-y-8">
          <WeeklyAlbumsBlock albums={weeklyAlbums} />
          <FriendsFeedBlock activities={friendActivities} />
          <FriendCoversBlock covers={friendCovers} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

/** Le titre de bloc : un filet, un libelle en mono, et « Tout voir ». */
function BlockHeading({ id, title, href, linkLabel = "Tout voir" }: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
      <h2
        id={id}
        className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Ce qui manque, et le geste pour le combler — en une ligne. */
function EmptyLine({ children, href, action }: {
  children: React.ReactNode;
  href: string;
  action: string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {children}{" "}
      <Link href={href} className="font-semibold text-foreground underline-offset-4 hover:underline">
        {action}
      </Link>
    </p>
  );
}

/** « 4,5 » : la note stockee sur 10, lue en etoiles sur 5. */
function formatRating(rating: number): string {
  return (Math.round(rating) / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function Avatar({ url, name, size = 32 }: { url?: string | null; name: string; size?: number }) {
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

// ---------------------------------------------------------------------------
// Toi — style Atelier
// ---------------------------------------------------------------------------

function WeekStats({ stats, plan }: { stats: PracticeStats; plan: WeeklyPlan | null }) {
  return (
    <section aria-labelledby="home-week">
      <BlockHeading id="home-week" title="Ta semaine" href="/jouer" linkLabel="Carnet" />
      <dl className="grid grid-cols-4 gap-3">
        <Stat
          label="minutes"
          value={stats.minutesThisWeek}
        />
        <Stat label={stats.sessionsThisWeek > 1 ? "sessions" : "session"} value={stats.sessionsThisWeek} />
        <Stat
          label={`série · record ${stats.longestStreak}`}
          value={
            <>
              {stats.currentStreak}
              <small className="text-[0.55em] text-muted-foreground">j</small>
            </>
          }
        />
        <Stat
          label="objectifs"
          value={
            plan && plan.goals.length > 0 ? (
              <>
                {plan.completedCount}
                <small className="text-[0.55em] text-muted-foreground">/{plan.goals.length}</small>
              </>
            ) : (
              <span className="text-muted-foreground">–</span>
            )
          }
        />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1">
      <dt className="truncate font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular font-display text-[32px] font-bold leading-none">{value}</dd>
    </div>
  );
}

function formatWhen(practicedAt: string): string {
  const then = new Date(practicedAt);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return `le ${then.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/**
 * Le seul bouton ambre de la page : reprendre. Il ouvre le morceau dans
 * Jouer, ou le metronome se cale sur son tempo.
 */
function ResumeBlock({ resume }: { resume: HomeViewProps["resume"] }) {
  if (!resume) {
    return (
      <section aria-labelledby="home-resume">
        <BlockHeading id="home-resume" title="Reprendre" />
        <EmptyLine href="/biblio" action="Choisis un morceau à travailler">
          Aucun morceau en cours.
        </EmptyLine>
      </section>
    );
  }

  const { song, bestBpm, lastSession } = resume;
  const tempo = songTempoProgress(song, bestBpm);
  const percent = tempo ? tempo.percent : song.progress_percent;

  const recap = lastSession
    ? [
        `Dernière session ${formatWhen(lastSession.practiced_at)}`,
        lastSession.bpm_achieved ? `${lastSession.bpm_achieved} BPM` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "En cours d'apprentissage";

  return (
    <section aria-labelledby="home-resume">
      <BlockHeading id="home-resume" title="Reprendre" />
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1">
        <Cover src={song.cover_url} className="row-span-2 h-14 w-14 rounded-[4px]" priority />
        <p id="home-resume-title" className="min-w-0 truncate text-[15px] font-bold">
          {song.title}
          {song.artist && <span className="font-medium text-muted-foreground"> · {song.artist}</span>}
        </p>
        <span className="row-span-2 grid justify-items-end gap-1">
          <span className="tabular font-display text-xl font-bold leading-none">
            {tempo ? (
              <>
                {tempo.achieved}
                <span className="text-sm text-muted-foreground">/{tempo.target}</span>
              </>
            ) : (
              <>
                {percent}
                <span className="text-sm text-muted-foreground"> %</span>
              </>
            )}
          </span>
          <Frets value={percent} label={tempo ? `${tempo.achieved} sur ${tempo.target} BPM` : `${percent} %`} />
        </span>
        <p className="tabular min-w-0 truncate text-[13px] text-muted-foreground">{recap}</p>
      </div>

      <Link
        href={`/jouer?song=${song.id}`}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Play className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
        Jouer ce morceau
      </Link>
    </section>
  );
}

/** N'apparait que s'il y a quelque chose a faire. */
function PendingBlock({ pending }: { pending: HomeViewProps["pending"] }) {
  const rows = [
    {
      count: pending.friends,
      label: (n: number) => (n > 1 ? `${n} demandes d'amis` : "1 demande d'ami"),
      href: "/commu/amis",
      icon: UserPlus,
    },
    {
      count: pending.challenges,
      label: (n: number) => (n > 1 ? `${n} défis en attente` : "1 défi en attente"),
      href: "/commu/defis",
      icon: Trophy,
    },
    {
      count: pending.bands,
      label: (n: number) => (n > 1 ? `${n} invitations de groupe` : "1 invitation de groupe"),
      href: "/commu/groupes",
      icon: Users,
    },
  ].filter((row) => row.count > 0);

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="home-pending">
      <BlockHeading id="home-pending" title="À traiter" />
      <ul>
        {rows.map(({ count, label, href, icon: RowIcon }) => (
          <li key={href} className="border-b border-border last:border-b-0">
            <Link
              href={href}
              className="flex min-h-[48px] items-center gap-3 py-2 text-sm font-semibold transition-colors hover:text-primary"
            >
              <RowIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">{label(count)}</span>
              <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Les derniers badges, et le plus proche a debloquer : ce qui donne envie
 * de faire une session de plus.
 */
function BadgesBlock({ badges }: { badges: BadgeStatus[] }) {
  const recent = badges
    .filter((badge) => badge.level > 0 && badge.unlockedAt)
    .sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!))
    .slice(0, 3);

  // Le palier le plus proche, parmi les badges a paliers pas encore finis.
  const closest = badges
    .filter((badge) => BADGES_BY_ID[badge.id]?.kind === "tiered" && badge.next !== null && badge.value !== null)
    .map((badge) => ({ badge, ratio: badge.value! / badge.next! }))
    .filter(({ ratio }) => ratio < 1)
    .sort((a, b) => b.ratio - a.ratio)[0]?.badge;

  if (recent.length === 0 && !closest) return null;

  const closestDef = closest ? BADGES_BY_ID[closest.id] : null;

  return (
    <section aria-labelledby="home-badges">
      <BlockHeading id="home-badges" title="Badges" href="/profil/badges" />
      {recent.length > 0 && (
        <ul className="mb-3 flex gap-4">
          {recent.map((badge) => (
            <li key={badge.id} className="flex w-[76px] flex-col items-center gap-1 text-center">
              <BadgeMedal badgeId={badge.id} level={badge.level} count={badge.count} />
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
                {badgeLabel(badge.id, badge.level)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {closest && closestDef?.kind === "tiered" && (
        <Link
          href="/profil/badges"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-3 transition-colors hover:text-primary"
        >
          <span className="min-w-0">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Prochain · {badgeLabel(closest.id, closest.level + 1)}
            </span>
            <span className="block truncate text-sm font-semibold">{closestDef.goal(closest.next!)}</span>
          </span>
          <span className="grid justify-items-end gap-1">
            <span className="tabular font-display text-xl font-bold leading-none">
              {closest.value}
              <span className="text-sm text-muted-foreground">/{closest.next}</span>
            </span>
            <Frets value={(closest.value! / closest.next!) * 100} label={`${closest.value} sur ${closest.next}`} />
          </span>
        </Link>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tes ajouts — style Etagere
// ---------------------------------------------------------------------------

/** Une etagere : des pochettes qui defilent, le bord coupe a l'ecran. */
function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
      {children}
    </ul>
  );
}

function ShelfItem({ href, cover, title, subtitle, badge }: {
  href: string;
  cover?: string | null;
  title: string;
  subtitle?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <li className="w-[104px] shrink-0 snap-start">
      <Link href={href} className="group block">
        <Cover src={cover} className="aspect-square w-full rounded-[4px]">
          {badge}
        </Cover>
        <p className="mt-1.5 truncate text-[13px] font-semibold group-hover:underline">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </Link>
    </li>
  );
}

function RecentSongsShelf({ songs }: { songs: Song[] }) {
  return (
    <section aria-labelledby="home-songs">
      <BlockHeading id="home-songs" title="Derniers morceaux ajoutés" href="/biblio" linkLabel="Biblio" />
      {songs.length === 0 ? (
        <EmptyLine href="/biblio" action="Ajoute ton premier morceau">
          Ta bibliothèque est vide.
        </EmptyLine>
      ) : (
        <Shelf>
          {songs.map((song) => (
            <ShelfItem
              key={song.id}
              href={`/biblio?song=${song.id}`}
              cover={song.cover_url}
              title={song.title}
              subtitle={song.artist}
            />
          ))}
        </Shelf>
      )}
    </section>
  );
}

function RecentAlbumsShelf({ albums }: { albums: AlbumReview[] }) {
  return (
    <section aria-labelledby="home-albums">
      <BlockHeading id="home-albums" title="Tes dernières écoutes" href="/biblio/albums" linkLabel="Albums" />
      {albums.length === 0 ? (
        <EmptyLine href="/biblio/albums" action="Note ton premier album">
          Aucun album écouté pour l&apos;instant.
        </EmptyLine>
      ) : (
        <Shelf>
          {albums.map((album) => (
            <ShelfItem
              key={album.id}
              href={album.spotify_id ? `/albums/${album.spotify_id}` : "/biblio/albums"}
              cover={album.cover_url}
              title={album.album_name}
              subtitle={album.artist_name}
              badge={<RatingBadge rating={album.rating} />}
            />
          ))}
        </Shelf>
      )}
    </section>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="tabular absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-[3px] bg-black/75 px-1 py-0.5 text-[11px] font-bold text-white">
      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} aria-hidden="true" />
      {formatRating(rating)}
      <span className="sr-only"> sur 5</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// La communaute — style Fanzine
// ---------------------------------------------------------------------------

function WeeklyAlbumsBlock({ albums }: { albums: WeeklyAlbum[] }) {
  return (
    <section aria-labelledby="home-weekly">
      <BlockHeading id="home-weekly" title="Albums de la semaine" href="/commu/albums" />
      {albums.length === 0 ? (
        <EmptyLine href="/biblio/albums" action="Note ce que tu écoutes">
          Personne n&apos;a encore noté d&apos;album cette semaine.
        </EmptyLine>
      ) : (
        <ol className="grid grid-cols-3 gap-2">
          {albums.map((album, index) => {
            const content = (
              <Cover src={album.cover_url} className="aspect-square w-full rounded-[4px]">
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-black/85" />
                <span className="absolute left-2 top-1.5 font-display text-2xl font-extrabold leading-none text-white drop-shadow">
                  {index + 1}
                </span>
                <span className="absolute inset-x-2 bottom-1.5 text-white">
                  <span className="block truncate font-display text-base font-extrabold uppercase leading-[0.95]">
                    {album.album_name}
                  </span>
                  <span className="tabular flex items-center gap-1 text-[11px] text-white/80">
                    <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} aria-hidden="true" />
                    {formatRating(album.avg_rating)}
                    <span aria-hidden="true">·</span>
                    {album.review_count} {album.review_count > 1 ? "écoutes" : "écoute"}
                  </span>
                </span>
              </Cover>
            );

            return (
              <li key={album.key} aria-label={`${album.album_name}, ${album.artist_name}`}>
                {album.spotify_id ? (
                  <Link href={`/albums/${album.spotify_id}`} className="block transition-opacity hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Ce dont parle une activite : le morceau, l'album, l'ami. */
function activitySubject(activity: ActivityWithDetails): { title: string; cover?: string | null } | null {
  if (activity.type === "badge_unlocked" && activity.metadata?.title) {
    return { title: String(activity.metadata.title) };
  }
  if (activity.albumReview) {
    return { title: activity.albumReview.album_name, cover: activity.albumReview.cover_url };
  }
  if (activity.albumWishlistItem) {
    return { title: activity.albumWishlistItem.album_name, cover: activity.albumWishlistItem.cover_url };
  }
  if (activity.wishlistSong) {
    return { title: activity.wishlistSong.title, cover: activity.wishlistSong.cover_url };
  }
  if (activity.song) {
    return { title: activity.song.title, cover: activity.song.cover_url };
  }
  if (activity.friend) {
    return { title: activity.friend.display_name || activity.friend.username };
  }
  return null;
}

function FriendsFeedBlock({ activities }: { activities: ActivityWithDetails[] }) {
  return (
    <section aria-labelledby="home-feed">
      <BlockHeading id="home-feed" title="Chez tes amis" href="/commu" linkLabel="Feed" />
      {activities.length === 0 ? (
        <EmptyLine href="/commu/amis" action="Trouve des amis">
          Rien de neuf chez tes amis.
        </EmptyLine>
      ) : (
        <ul>
          {activities.map((activity) => {
            const name = activity.user.display_name || activity.user.username;
            const subject = activitySubject(activity);

            return (
              <li key={activity.id} className="border-b border-border last:border-b-0">
                <Link
                  href={profileHref(activity.user.username)}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <Avatar url={activity.user.avatar_url} name={name} />
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="font-semibold">{name}</span>{" "}
                    <span className="text-muted-foreground">{ACTIVITY_MESSAGES[activity.type]}</span>
                    {subject && <span className="block truncate font-semibold">{subject.title}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {formatActivityDate(activity.created_at)}
                    </span>
                  </span>
                  {subject && subject.cover !== undefined ? (
                    <Cover src={subject.cover} className="h-11 w-11 rounded-[3px]" />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FriendCoversBlock({ covers }: { covers: CoverFeedItem[] }) {
  if (covers.length === 0) return null;

  return (
    <section aria-labelledby="home-covers">
      <BlockHeading id="home-covers" title="Dernières covers" href="/commu/covers" />
      <ul className="grid grid-cols-2 gap-2">
        {covers.map((cover) => {
          const name = cover.author.display_name || cover.author.username;

          return (
            <li key={cover.id}>
              <Link href="/commu/covers" className="group block">
                <Cover
                  src={cover.thumbnail_url ?? cover.song.cover_url}
                  className="aspect-[4/3] w-full rounded-[4px]"
                >
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/85" />
                  <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                    <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
                  </span>
                  <span className="absolute inset-x-2 bottom-1.5 text-white">
                    <span className="block truncate font-display text-lg font-extrabold uppercase leading-[0.95]">
                      {cover.song.title}
                    </span>
                    <span className="block truncate text-[11px] text-white/80">par {name}</span>
                  </span>
                </Cover>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
