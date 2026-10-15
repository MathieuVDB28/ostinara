import { notFound, redirect } from "next/navigation";
import { getPublicProfileByUsername } from "@/lib/actions/profile";
import { getUserBadges } from "@/lib/actions/badges";
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
  const badges = data.is_friend ? await getUserBadges(data.profile.id) : [];

  return <PublicProfileView data={data} badges={badges} />;
}
