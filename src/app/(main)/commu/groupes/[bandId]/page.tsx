import { notFound } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getSetlists } from "@/lib/actions/setlists";
import { getBandRehearsals } from "@/lib/actions/rehearsals";
import { getActiveJamSession } from "@/lib/actions/jam-sessions";
import { getAuthenticatedUser } from "@/lib/supabase/server";
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

  const [band, allSetlists, rehearsals, activeJam] = await Promise.all([
    getBand(bandId),
    getSetlists(),
    getBandRehearsals(bandId),
    getActiveJamSession(bandId),
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
    />
  );
}
