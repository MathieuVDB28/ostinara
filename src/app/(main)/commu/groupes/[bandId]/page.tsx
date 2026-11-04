import { notFound } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getSetlists } from "@/lib/actions/setlists";
import { getBandRehearsals } from "@/lib/actions/rehearsals";
import { getActiveJamSession } from "@/lib/actions/jam-sessions";
import { getBandMessages } from "@/lib/actions/band-messages";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { UserPlan } from "@/types";
import { BandDetailView } from "@/components/setlists/band-detail-view";

export default async function BandDetailPage({
  params,
}: {
  params: Promise<{ bandId: string }>;
}) {
  const { bandId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const [band, allSetlists, rehearsals, activeJam, messages, { data: profile }] = await Promise.all([
    getBand(bandId),
    getSetlists(),
    getBandRehearsals(bandId),
    getActiveJamSession(bandId),
    // Sous RLS : vide pour qui n'a pas le plan Band.
    getBandMessages(bandId),
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
  ]);

  if (!band) {
    notFound();
  }

  return (
    <BandDetailView
      band={band}
      setlists={allSetlists.filter((setlist) => setlist.band_id === bandId)}
      rehearsals={rehearsals}
      activeJam={activeJam}
      currentUserId={user.id}
      userPlan={(profile?.plan as UserPlan | undefined) ?? "free"}
      messages={messages}
    />
  );
}
