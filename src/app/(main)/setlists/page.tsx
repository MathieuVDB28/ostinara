import { getSetlists } from "@/lib/actions/setlists";
import { getUserBands, getPendingBandInvitations } from "@/lib/actions/bands";
import { createClient } from "@/lib/supabase/server";
import { SetlistsView } from "@/components/setlists/setlists-view";

export default async function SetlistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const [setlists, bands, pendingInvitations] = await Promise.all([
    getSetlists(),
    getUserBands(),
    getPendingBandInvitations(),
  ]);

  return (
    <SetlistsView
      initialSetlists={setlists}
      bands={bands}
      pendingInvitations={pendingInvitations}
      userPlan={profile?.plan || "free"}
      currentUserId={user.id}
    />
  );
}
