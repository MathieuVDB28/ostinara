import { getFeedActivities } from "@/lib/actions/activities";
import { FeedView } from "@/components/social/feed-view";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function CommuFeedPage() {
  const user = await getAuthenticatedUser();
  const activities = await getFeedActivities();

  return <FeedView initialActivities={activities} currentUserId={user?.id || ""} />;
}
