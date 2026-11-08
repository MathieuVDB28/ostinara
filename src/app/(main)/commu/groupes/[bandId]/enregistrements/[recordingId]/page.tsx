import { notFound, redirect } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getBandRecording } from "@/lib/actions/band-recordings";
import { bandStatus } from "@/lib/band-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { RecordingDetailView } from "@/components/recordings/recording-detail-view";

/** Un enregistrement du groupe : lecture et commentaires. */
export default async function BandRecordingPage({
  params,
}: {
  params: Promise<{ bandId: string; recordingId: string }>;
}) {
  const { bandId, recordingId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [band, details] = await Promise.all([getBand(bandId), getBandRecording(bandId, recordingId)]);
  if (!band || !details || !band.members.some((member) => member.user_id === user.id)) notFound();

  return (
    <RecordingDetailView
      bandId={band.id}
      bandName={band.name}
      details={details}
      currentUserId={user.id}
      readOnly={bandStatus(band) === "read_only"}
    />
  );
}
