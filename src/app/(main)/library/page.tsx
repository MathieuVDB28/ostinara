import { getSongs } from "@/lib/actions/songs";
import { getWishlistSongs } from "@/lib/actions/wishlist";
import { getPlaylists } from "@/lib/actions/playlists";
import { LibraryView } from "@/components/library/library-view";

export default async function LibraryPage() {
  const [songs, wishlistSongs, playlists] = await Promise.all([
    getSongs(),
    getWishlistSongs(),
    getPlaylists(),
  ]);

  return (
    <LibraryView
      initialSongs={songs}
      initialWishlistSongs={wishlistSongs}
      initialPlaylists={playlists}
    />
  );
}
