import { notFound, redirect } from "next/navigation";
import { getSetlist } from "@/lib/actions/setlists";
import { getBandMembersSongs } from "@/lib/actions/bands";
import { getSongs } from "@/lib/actions/songs";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { SetlistDetailView } from "@/components/setlists/setlist-detail-view";
import type { UserPlan } from "@/types";

interface SetlistPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetlistPage({ params }: SetlistPageProps) {
  const { id } = await params;

  // La setlist, l'utilisateur et son plan ne dependent pas les uns des
  // autres : les enchainer serialisait trois allers-retours.
  const supabase = await createClient();
  const [setlist, user] = await Promise.all([
    getSetlist(id),
    getAuthenticatedUser(),
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!setlist) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = (profile?.plan || "free") as UserPlan;

  // Get songs based on whether it's a band setlist or personal
  let songSources;
  if (setlist.band_id) {
    songSources = await getBandMembersSongs(setlist.band_id);
  } else {
    const personalSongs = await getSongs();
    songSources = [{ member: null, songs: personalSongs }];
  }

  return (
    <SetlistDetailView
      setlist={setlist}
      songSources={songSources}
      userPlan={userPlan}
    />
  );
}
