import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getSongs } from "@/lib/actions/songs";
import {
  getLastPracticeSession,
  getPracticeStats,
  getSongPracticeStats,
} from "@/lib/actions/practice";
import { getWeeklyPlan } from "@/lib/actions/weekly-plan";
import { getUserAlbumReviews, getWeeklyAlbums } from "@/lib/actions/albums";
import { getFeedActivities } from "@/lib/actions/activities";
import { getCoversFeed } from "@/lib/actions/covers";
import { getPendingRequestsCount } from "@/lib/actions/friends";
import { getPendingChallengesCount } from "@/lib/actions/challenges";
import { getPendingBandInvitations } from "@/lib/actions/bands";
import { syncBadges } from "@/lib/badges/sync";
import { HomeView } from "@/components/home/home-view";

export const metadata = {
  title: "Accueil | Ostinara",
  description: "Ta semaine, tes derniers ajouts et ce qui se passe chez tes amis",
};

/** Combien d'elements chaque bloc montre : un resume, pas une liste. */
const RECENT_SONGS = 8;
const RECENT_ALBUMS = 8;
const WEEKLY_ALBUMS = 6;
const FEED_ITEMS = 5;
const COVERS = 4;

/**
 * L'accueil : la page d'arrivee de l'app.
 *
 * Un resume de chaque onglet, sans en refaire aucun. Tout ce qui s'y lit
 * existe deja dans une Server Action ; chaque bloc renvoie a la page qui
 * le detaille.
 */
export default async function AccueilPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();

  const [
    { data: profile },
    songs,
    lastSession,
    practiceStats,
    weeklyPlan,
    recentAlbums,
    weeklyAlbums,
    // Le feed et les covers incluent ses propres posts : on en lit un peu
    // plus pour qu'il reste de quoi remplir apres le filtre.
    activities,
    covers,
    pendingFriends,
    pendingChallenges,
    bandInvitations,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single(),
    getSongs(),
    getLastPracticeSession(),
    getPracticeStats(),
    getWeeklyPlan(),
    getUserAlbumReviews(RECENT_ALBUMS),
    getWeeklyAlbums(),
    getFeedActivities(FEED_ITEMS * 4),
    getCoversFeed(COVERS * 3),
    getPendingRequestsCount(),
    getPendingChallengesCount(),
    getPendingBandInvitations(),
    // Les badges ne s'affichent plus ici (ils sont dans Profil), mais
    // l'accueil verifie toujours ce qui a ete debloque sans action de sa
    // part — un ami qui accepte, un defi gagne a l'echeance — pour que le
    // toast l'annonce.
    syncBadges({ revalidate: false }),
  ]);

  /*
   * Le morceau a reprendre : celui de la derniere session tant qu'il
   * n'est pas maitrise, a defaut le premier « en cours ». La fiche de
   * Jouer fait le meme choix.
   */
  const lastSong = lastSession?.song
    ? songs.find((song) => song.id === lastSession.song!.id) ?? null
    : null;
  const resumeSong =
    (lastSong && lastSong.status !== "mastered" ? lastSong : null) ??
    songs.find((song) => song.status === "learning") ??
    null;

  const resumeStats = resumeSong ? await getSongPracticeStats(resumeSong.id) : null;

  const recentSongs = [...songs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_SONGS);

  // Les covers ont leur propre bloc : on ne les repete pas dans le feed.
  const friendActivities = activities
    .filter((activity) => activity.user_id !== user.id && activity.type !== "cover_posted")
    .slice(0, FEED_ITEMS);

  const friendCovers = covers.filter((cover) => !cover.isOwn).slice(0, COVERS);

  return (
    <HomeView
      displayName={profile?.display_name || profile?.username || null}
      practiceStats={practiceStats}
      weeklyPlan={weeklyPlan}
      resume={
        resumeSong
          ? {
              song: resumeSong,
              bestBpm: resumeStats?.bestBpm ?? null,
              lastSession: lastSession?.song?.id === resumeSong.id ? lastSession : null,
            }
          : null
      }
      pending={{
        friends: pendingFriends,
        challenges: pendingChallenges,
        bands: bandInvitations.length,
      }}
      recentSongs={recentSongs}
      recentAlbums={recentAlbums}
      weeklyAlbums={weeklyAlbums?.albums.slice(0, WEEKLY_ALBUMS) ?? []}
      friendActivities={friendActivities}
      friendCovers={friendCovers}
    />
  );
}
