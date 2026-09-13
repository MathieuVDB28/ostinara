import { SectionHeader } from "@/components/layout/section-header";
import { getPendingRequestsCount } from "@/lib/actions/friends";
import { getPendingChallengesCount } from "@/lib/actions/challenges";
import { getPendingBandInvitations } from "@/lib/actions/bands";
import { NAV_TABS, type BadgeCounts } from "@/lib/navigation";

const commuTab = NAV_TABS.find((tab) => tab.href === "/commu")!;

export default async function CommuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingFriends, pendingChallenges, bandInvitations] = await Promise.all([
    getPendingRequestsCount(),
    getPendingChallengesCount(),
    getPendingBandInvitations(),
  ]);

  const badges: BadgeCounts = {
    friends: pendingFriends,
    challenges: pendingChallenges,
    bands: bandInvitations.length,
  };

  return (
    <>
      <SectionHeader tab={commuTab} title="Communauté" badges={badges} />
      {children}
    </>
  );
}
