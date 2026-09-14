import { getSetlists } from "@/lib/actions/setlists";
import { getUserBands, getPendingBandInvitations } from "@/lib/actions/bands";
import { getUpcomingRehearsals } from "@/lib/actions/rehearsals";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { GroupsView } from "@/components/setlists/groups-view";

export default async function CommuGroupesPage() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const [setlists, bands, invitations, rehearsals] = await Promise.all([
    getSetlists(),
    getUserBands(),
    getPendingBandInvitations(),
    getUpcomingRehearsals(),
  ]);

  return (
    <GroupsView
      setlists={setlists}
      bands={bands}
      invitations={invitations}
      upcomingRehearsals={rehearsals}
      userPlan={profile?.plan || "free"}
    />
  );
}
