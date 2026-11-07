import { notFound } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getBandSeats } from "@/lib/actions/band-seats";
import { getSetlists } from "@/lib/actions/setlists";
import { getBandRehearsals } from "@/lib/actions/rehearsals";
import { getBandRehearsalJournal } from "@/lib/actions/rehearsal-logs";
import { getBandPolls } from "@/lib/actions/rehearsal-polls";
import { getActiveJamSession } from "@/lib/actions/jam-sessions";
import { getBandMessages } from "@/lib/actions/band-messages";
import { bandGraceEnd, bandStatus } from "@/lib/band-access";
import { BAND_PLAN_SEATS } from "@/lib/band-seats";
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

  const [band, allSetlists, rehearsals, activeJam, messages, seats, journal, polls] = await Promise.all([
    getBand(bandId),
    getSetlists(),
    getBandRehearsals(bandId),
    getActiveJamSession(bandId),
    // Sous RLS : vide quand le groupe est en lecture seule.
    getBandMessages(bandId),
    getBandSeats(),
    getBandRehearsalJournal(bandId),
    getBandPolls(bandId),
  ]);

  if (!band) {
    notFound();
  }

  const me = band.members.find((member) => member.user_id === user.id);
  const canOfferSeat =
    me?.profile?.plan === "band" &&
    !seats?.mySeat &&
    (seats?.owned.length ?? 0) < BAND_PLAN_SEATS;

  return (
    <BandDetailView
      band={band}
      status={bandStatus(band)}
      graceEndsAt={bandGraceEnd(band)?.toISOString() ?? null}
      setlists={allSetlists.filter((setlist) => setlist.band_id === bandId)}
      rehearsals={rehearsals}
      journal={journal}
      activeJam={activeJam}
      polls={polls}
      currentUserId={user.id}
      messages={messages}
      canOfferSeat={canOfferSeat}
      seatInvitedIds={(seats?.owned ?? []).map((seat) => seat.person.id)}
    />
  );
}
