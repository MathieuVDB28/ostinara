import { getFeedActivities } from "@/lib/actions/activities";
import { FeedView } from "@/components/social/feed-view";

export default async function FeedPage() {
  const activities = await getFeedActivities();

  return <FeedView initialActivities={activities} />;
}
