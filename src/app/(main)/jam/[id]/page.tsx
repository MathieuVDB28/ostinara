import { notFound, redirect } from "next/navigation";
import { getJamSession, getJamMessages, joinJamSession } from "@/lib/actions/jam-sessions";
import { createClient } from "@/lib/supabase/server";
import { JamSessionView } from "@/components/jam";

interface JamPageProps {
  params: Promise<{ id: string }>;
}

export default async function JamPage({ params }: JamPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Check if user has band plan
  if (profile.plan !== "band") {
    redirect("/setlists");
  }

  // Get session
  const session = await getJamSession(id);
  if (!session) {
    notFound();
  }

  // Check if session is ended
  if (session.status === "ended") {
    redirect("/setlists");
  }

  // Check if user is band member
  const isMember = session.band.members?.some(
    (m) => m.user_id === user.id
  );
  if (!isMember) {
    redirect("/setlists");
  }

  // Auto-join if not already participant
  const isParticipant = session.participants.some(
    (p) => p.user_id === user.id && p.is_active
  );
  if (!isParticipant) {
    await joinJamSession(id);
  }

  // Get initial messages
  const messages = await getJamMessages(id);

  return (
    <JamSessionView
      initialSession={session}
      initialMessages={messages}
      currentUser={profile}
    />
  );
}
