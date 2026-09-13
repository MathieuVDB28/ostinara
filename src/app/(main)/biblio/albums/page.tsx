import { getUserAlbumReviews } from "@/lib/actions/albums";
import { getAlbumWishlist } from "@/lib/actions/album-wishlist";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { AlbumsView } from "@/components/albums/albums-view";

export default async function BiblioAlbumsPage() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user!.id)
    .single();

  const [reviews, wishlist] = await Promise.all([
    getUserAlbumReviews(),
    getAlbumWishlist(),
  ]);

  return (
    <AlbumsView
      initialReviews={reviews}
      initialWishlist={wishlist}
      userPlan={profile?.plan || "free"}
    />
  );
}
