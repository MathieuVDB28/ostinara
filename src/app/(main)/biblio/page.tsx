import { getSongs } from "@/lib/actions/songs";
import { getPlaylists } from "@/lib/actions/playlists";
import { getSpotifyConnectionStatus, requirePaidPlan } from "@/lib/actions/spotify";
import { getAllSongPracticeStats } from "@/lib/actions/practice";
import { LibraryView } from "@/components/library/library-view";

/**
 * `?song=<id>` ouvre directement la fiche du morceau : c'est la ou
 * atterrit un resultat de la recherche globale. Le parametre est lu ici,
 * cote serveur, plutot que par un `useSearchParams` qui obligerait la vue
 * a une frontiere Suspense de plus.
 */
export default async function BiblioPage({
  searchParams,
}: {
  searchParams: Promise<{ song?: string }>;
}) {
  const { song: initialSongId } = await searchParams;

  /*
   * Les tempos partent avec le reste : la progression affichee sur chaque
   * carte est le meilleur BPM tenu, pas un curseur. Une lecture agregee,
   * pas une par morceau.
   */
  const [songs, playlists, spotifyStatus, planCheck, songPracticeStats] =
    await Promise.all([
      getSongs(),
      getPlaylists(),
      getSpotifyConnectionStatus(),
      requirePaidPlan(),
      getAllSongPracticeStats(),
    ]);

  return (
    <LibraryView
      initialSongs={songs}
      initialPlaylists={playlists}
      userPlan={planCheck.plan}
      spotifyConnected={spotifyStatus.connected}
      initialSongId={initialSongId}
      songPracticeStats={songPracticeStats}
    />
  );
}
