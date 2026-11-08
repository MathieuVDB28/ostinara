import { notFound, redirect } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getBandRecordings, getBandRecordingStorage } from "@/lib/actions/band-recordings";
import { bandStatus } from "@/lib/band-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { RecordingsListView } from "@/components/recordings/recordings-list-view";

/** Tous les enregistrements d'un groupe. */
export default async function BandRecordingsPage({ params }: { params: Promise<{ bandId: string }> }) {
  const { bandId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [band, recordings, storageUsed] = await Promise.all([
    getBand(bandId),
    getBandRecordings(bandId),
    getBandRecordingStorage(bandId),
  ]);
  if (!band || !band.members.some((member) => member.user_id === user.id)) notFound();

  return (
    <RecordingsListView
      bandId={band.id}
      bandName={band.name}
      recordings={recordings}
      storageUsed={storageUsed ?? 0}
      readOnly={bandStatus(band) === "read_only"}
    />
  );
}
