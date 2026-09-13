import { notFound, redirect } from "next/navigation";
import { getJamSession, getJamMessages, joinJamSession } from "@/lib/actions/jam-sessions";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { JamSessionView } from "@/components/jam";

interface JamPageProps {
  params: Promise<{ id: string }>;
}

export default async function JamPage({ params }: JamPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  // Profil, session et messages ne dependent pas les uns des autres :
  // on les demande ensemble plutot qu'en trois allers-retours successifs.
  // Les controles d'acces ci-dessous restent inchanges, et rien n'est rendu
  // avant qu'ils soient passes.
  const [{ data: profile }, session, messages] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getJamSession(id),
    getJamMessages(id),
  ]);

  if (!profile) {
    redirect("/login");
  }

  if (!session) {
    notFound();
  }

  // Check if session is ended
  if (session.status === "ended") {
    redirect("/setlists");
  }

  // Access control
  if (session.band_id && session.band) {
    // Band jam: check band plan and membership
    if (profile.plan !== "band") {
      redirect("/setlists");
    }
    const isMember = session.band.members?.some(
      (m) => m.user_id === user.id
    );
    if (!isMember) {
      redirect("/setlists");
    }
  } else {
    // Personal jam: only host can access
    if (session.host_id !== user.id) {
      redirect("/setlists");
    }
  }

  // Auto-join if not already participant
  const isParticipant = session.participants.some(
    (p) => p.user_id === user.id && p.is_active
  );
  if (!isParticipant) {
    await joinJamSession(id);
  }

  return (
    <JamSessionView
      initialSession={session}
      initialMessages={messages}
      currentUser={profile}
    />
  );
}
