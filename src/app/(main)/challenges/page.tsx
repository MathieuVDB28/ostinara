import { getChallenges, getLeaderboard, getPendingChallengesCount } from "@/lib/actions/challenges";
import { getFriends } from "@/lib/actions/friends";
import { getSongs } from "@/lib/actions/songs";
import { ChallengesView } from "@/components/challenges/challenges-view";

export default async function ChallengesPage() {
  const [challenges, leaderboard, pendingCount, friends, songs] = await Promise.all([
    getChallenges(),
    getLeaderboard("week"),
    getPendingChallengesCount(),
    getFriends(),
    getSongs(),
  ]);

  return (
    <ChallengesView
      initialChallenges={challenges}
      initialLeaderboard={leaderboard}
      pendingCount={pendingCount}
      friends={friends}
      songs={songs}
    />
  );
}
