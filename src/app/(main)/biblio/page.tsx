import { getSongs } from "@/lib/actions/songs";
import { getPlaylists } from "@/lib/actions/playlists";
import { getSpotifyConnectionStatus, requirePaidPlan } from "@/lib/actions/spotify";
import { LibraryView } from "@/components/library/library-view";

export default async function BiblioPage() {
  const [songs, playlists, spotifyStatus, planCheck] = await Promise.all([
    getSongs(),
    getPlaylists(),
    getSpotifyConnectionStatus(),
    requirePaidPlan(),
  ]);

  return (
    <LibraryView
      initialSongs={songs}
      initialPlaylists={playlists}
      userPlan={planCheck.plan}
      spotifyConnected={spotifyStatus.connected}
    />
  );
}
