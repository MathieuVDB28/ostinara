import { notFound, redirect } from "next/navigation";
import { getPublicProfileByUsername } from "@/lib/actions/profile";
import { getUserBadges } from "@/lib/actions/badges";
import { getLibraryMatches } from "@/lib/actions/songs";
import { PublicProfileView } from "@/components/profile/public-profile-view";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicProfileByUsername(decodeURIComponent(username));

  if (!data) notFound();

  // Son propre pseudo : le vrai profil, avec ses reglages, est ailleurs.
  if (data.friendship_status === "self") redirect("/profil");

  // Les badges d'un ami se lisent entre amis seulement (RLS).
  const [badges, librarySongIds] = await Promise.all([
    data.is_friend ? getUserBadges(data.profile.id) : [],
    // Ses morceaux que j'ai deja : on ne me propose pas de les ajouter.
    getLibraryMatches(
      (data.all_songs ?? []).map((song) => ({
        key: song.id,
        title: song.title,
        artist: song.artist,
        deezer_id: song.deezer_id,
      }))
    ),
  ]);

  return <PublicProfileView data={data} badges={badges} librarySongIds={librarySongIds} />;
}
