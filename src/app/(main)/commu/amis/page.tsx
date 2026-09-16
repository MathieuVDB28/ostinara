import { getFriends, getPendingRequests, getFriendsLimitInfo } from "@/lib/actions/friends";
import { FriendsView } from "@/components/friends/friends-view";

export default async function CommuAmisPage({
  searchParams,
}: {
  searchParams: Promise<{ friend?: string }>;
}) {
  const { friend: initialFriendId } = await searchParams;

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
      initialFriendId={initialFriendId}
    />
  );
}
