import { notFound, redirect } from "next/navigation";
import { getRehearsal } from "@/lib/actions/rehearsals";
import { getBandMessages } from "@/lib/actions/band-messages";
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
  const messages = await getBandMessages(rehearsal.band_id, id);

  return (
    <RehearsalDetailView
      rehearsal={rehearsal}
      currentUserId={user.id}
      messages={messages}
    />
  );
}
