import { notFound, redirect } from "next/navigation";
import { getRehearsal } from "@/lib/actions/rehearsals";
import { getBand } from "@/lib/actions/bands";
import { getBandMessages } from "@/lib/actions/band-messages";
import { getShareSessionsDefault } from "@/lib/actions/practice";
import { getRehearsalLog } from "@/lib/actions/rehearsal-logs";
import { getBandRecordings } from "@/lib/actions/band-recordings";
import { getSetlistMemberReadiness } from "@/lib/actions/setlist-member-readiness";
import { bandStatus } from "@/lib/band-access";
import { getSetlists } from "@/lib/actions/setlists";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { RehearsalDetailView } from "@/components/rehearsals/rehearsal-detail-view";

interface RehearsalPageProps {
  params: Promise<{ id: string }>;
}

export default async function RehearsalPage({ params }: RehearsalPageProps) {
  const { id } = await params;

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const rehearsal = await getRehearsal(id);

  if (!rehearsal) {
    notFound();
  }

  // Fetch messages for this rehearsal's discussion thread
  const [messages, band, log, shareDefault, memberReadiness, recordings, setlists] = await Promise.all([
    getBandMessages(rehearsal.band_id, id),
    getBand(rehearsal.band_id),
    getRehearsalLog(id),
    getShareSessionsDefault(),
    rehearsal.setlist_id ? getSetlistMemberReadiness(rehearsal.setlist_id) : null,
    getBandRecordings(rehearsal.band_id, { rehearsalId: id }),
    getSetlists(),
  ]);

  const role = band?.members.find((member) => member.user_id === user.id)?.role;

  return (
    <RehearsalDetailView
      rehearsal={rehearsal}
      currentUserId={user.id}
      messages={messages}
      log={log}
      shareDefault={shareDefault}
      memberReadiness={memberReadiness}
      readOnly={!band || bandStatus(band) === "read_only"}
      recordings={recordings}
      canManage={rehearsal.created_by === user.id || role === "owner" || role === "admin"}
      bandSetlists={setlists.filter((s) => s.band_id === rehearsal.band_id).map(({ id, name }) => ({ id, name }))}
    />
  );
}
