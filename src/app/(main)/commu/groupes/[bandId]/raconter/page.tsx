import { notFound, redirect } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getShareSessionsDefault } from "@/lib/actions/practice";
import { getBandRehearsalJournal, getRehearsalLog } from "@/lib/actions/rehearsal-logs";
import { getRehearsal } from "@/lib/actions/rehearsals";
import { getSetlists } from "@/lib/actions/setlists";
import { bandStatus } from "@/lib/band-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { RehearsalLogForm } from "@/components/rehearsals/rehearsal-log-form";

/** Raconter une repete. `?repete=` : une repete planifiee, ou deja racontee a corriger. */
export default async function RaconterRepetePage({
  params,
  searchParams,
}: {
  params: Promise<{ bandId: string }>;
  searchParams: Promise<{ repete?: string }>;
}) {
  const { bandId } = await params;
  const { repete } = await searchParams;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [band, rehearsal, setlists, shareDefault] = await Promise.all([
    getBand(bandId),
    repete ? getRehearsal(repete) : null,
    getSetlists(),
    getShareSessionsDefault(),
  ]);

  if (!band || !band.members.some((member) => member.user_id === user.id)) notFound();
  if (repete && (!rehearsal || rehearsal.band_id !== bandId)) notFound();
  // Une repete future ou annulee ne se raconte pas ; en lecture seule, rien ne s'ecrit.
  if (bandStatus(band) === "read_only") redirect(`/commu/groupes/${bandId}`);
  if (rehearsal && (rehearsal.status === "cancelled" || new Date(rehearsal.date) > new Date())) {
    redirect(`/setlists/rehearsals/${rehearsal.id}`);
  }

  const [log, journal] = await Promise.all([
    rehearsal ? getRehearsalLog(rehearsal.id) : null,
    rehearsal ? null : getBandRehearsalJournal(bandId),
  ]);

  return (
    <RehearsalLogForm
      band={band}
      setlists={setlists.filter((setlist) => setlist.band_id === bandId)}
      currentUserId={user.id}
      rehearsal={rehearsal}
      log={log}
      unlogged={journal?.unlogged ?? []}
      shareDefault={shareDefault}
    />
  );
}
