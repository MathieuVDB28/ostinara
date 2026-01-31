import { getSongs } from "@/lib/actions/songs";
import { getWishlistSongs } from "@/lib/actions/wishlist";
import { getPlaylists } from "@/lib/actions/playlists";
import { getSpotifyConnectionStatus, requirePaidPlan } from "@/lib/actions/spotify";
import { LibraryView } from "@/components/library/library-view";

export default async function LibraryPage() {
  const [songs, wishlistSongs, playlists, spotifyStatus, planCheck] = await Promise.all([
    getSongs(),
    getWishlistSongs(),
    getPlaylists(),
    getSpotifyConnectionStatus(),
    requirePaidPlan(),
  ]);

  return (
    <LibraryView
      initialSongs={songs}
      initialWishlistSongs={wishlistSongs}
      initialPlaylists={playlists}
      userPlan={planCheck.plan}
      spotifyConnected={spotifyStatus.connected}
    />
  );
}
