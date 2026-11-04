import { notFound, redirect } from "next/navigation";
import { getLiveSessionView } from "@/lib/actions/live-sessions";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { LiveSessionView } from "@/components/live/live-session-view";

interface LiveSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveSessionPage({ params }: LiveSessionPageProps) {
  const { id } = await params;
  const [user, view] = await Promise.all([getAuthenticatedUser(), getLiveSessionView(id)]);

  if (!user) redirect("/login");
  if (!view) notFound();

  // Sa propre session se suit depuis son chrono, pas en spectateur.
  if (view.host.id === user.id) redirect("/jouer");

  return <LiveSessionView view={view} />;
}
