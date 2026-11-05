import { notFound, redirect } from "next/navigation";
import { getRehearsal } from "@/lib/actions/rehearsals";
import { getBand } from "@/lib/actions/bands";
import { getBandMessages } from "@/lib/actions/band-messages";
import { bandStatus } from "@/lib/band-access";
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
  const [messages, band] = await Promise.all([
    getBandMessages(rehearsal.band_id, id),
    getBand(rehearsal.band_id),
  ]);

  return (
    <RehearsalDetailView
      rehearsal={rehearsal}
      currentUserId={user.id}
      messages={messages}
      readOnly={!band || bandStatus(band) === "read_only"}
    />
  );
}
