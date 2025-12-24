import { getFriends, getPendingRequests, getFriendsLimitInfo } from "@/lib/actions/friends";
import { FriendsView } from "@/components/friends/friends-view";

export default async function FriendsPage() {
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
