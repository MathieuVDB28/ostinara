import { redirect } from "next/navigation";
import { getFriends, getPendingRequests, getFriendsLimitInfo } from "@/lib/actions/friends";
import { createClient } from "@/lib/supabase/server";
import { profileHref } from "@/lib/navigation";
import { FriendsView } from "@/components/friends/friends-view";

export default async function CommuAmisPage({
  searchParams,
}: {
  searchParams: Promise<{ friend?: string }>;
}) {
  // Ancien lien profond (?friend=<id>), encore present dans des PWA
  // installees et des notifications : le profil a maintenant sa page.
  const { friend } = await searchParams;
  if (friend) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("username").eq("id", friend).maybeSingle();
    if (data?.username) redirect(profileHref(data.username));
  }

  const [friends, requests, limitInfo] = await Promise.all([
    getFriends(),
    getPendingRequests(),
    getFriendsLimitInfo(),
  ]);

  return (
    <FriendsView
      initialFriends={friends}
      initialRequests={requests}
      limitInfo={limitInfo}
    />
  );
}
