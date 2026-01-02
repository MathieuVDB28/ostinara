import { getSongs } from "@/lib/actions/songs";
import { getWishlistSongs } from "@/lib/actions/wishlist";
import { LibraryView } from "@/components/library/library-view";

export default async function LibraryPage() {
  const [songs, wishlistSongs] = await Promise.all([
    getSongs(),
    getWishlistSongs(),
  ]);

  return <LibraryView initialSongs={songs} initialWishlistSongs={wishlistSongs} />;
}
