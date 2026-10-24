import { notFound, redirect } from "next/navigation";
import { getPublicProfileByUsername } from "@/lib/actions/profile";
import { getUserBadges } from "@/lib/actions/badges";
import { getLibraryMatches } from "@/lib/actions/songs";
import { getProfileSessions } from "@/lib/actions/activities";
import { getAuthenticatedUser } from "@/lib/supabase/server";
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

  const canView = !data.profile.is_private || data.is_friend;

  // Les badges font partie de la vitrine : entre amis, ou profil public (RLS).
  const [user, badges, librarySongIds, sessions] = await Promise.all([
    getAuthenticatedUser(),
    canView ? getUserBadges(data.profile.id) : [],
    // Ses morceaux que j'ai deja : on ne me propose pas de les ajouter.
    getLibraryMatches(
      (data.all_songs ?? []).map((song) => ({
        key: song.id,
        title: song.title,
        artist: song.artist,
        deezer_id: song.deezer_id,
      }))
    ),
    // Les sessions restent entre amis, meme sur un profil public.
    data.is_friend ? getProfileSessions(data.profile.id) : { sessions: [], hasMore: false },
  ]);

  return (
    <PublicProfileView
      data={data}
      badges={badges}
      librarySongIds={librarySongIds}
      sessions={sessions}
      currentUserId={user?.id ?? ""}
    />
  );
}
