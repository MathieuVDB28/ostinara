"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { loadAgenda, type AgendaEvent } from "@/lib/agenda";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";

const DAY = 86_400_000;

/** Un mois en arriere, six mois devant. */
export async function getAgenda(): Promise<AgendaEvent[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await loadAgenda(supabase, user.id, new Date(Date.now() - 31 * DAY), new Date(Date.now() + 183 * DAY));
  } catch (error) {
    console.error("Error fetching agenda:", error);
    return [];
  }
}

/** Les prochains rendez-vous, pour l'accueil. */
export async function getUpcomingAgenda(limit: number): Promise<AgendaEvent[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const events = await loadAgenda(supabase, user.id, new Date(Date.now() - DAY), new Date(Date.now() + 60 * DAY));
    return events.filter((event) => !event.done && new Date(event.ends_at).getTime() > Date.now()).slice(0, limit);
  } catch (error) {
    console.error("Error fetching upcoming agenda:", error);
    return [];
  }
}

export async function getCalendarToken(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("calendar_feeds").select("token").eq("user_id", user.id).maybeSingle();
  return data?.token ?? null;
}

/** Creer le lien d'abonnement, ou le remplacer (l'ancien cesse de marcher). */
export async function renewCalendarToken(): Promise<{ success: boolean; error?: string; token?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("renew_calendar_feed");
  if (error || !data) {
    console.error("Error renewing calendar feed:", error);
    return { success: false, error: await tErr(error?.message?.includes("calendar_feed_paid") ? "proOnly" : "updateFailed") };
  }
  revalidatePath("/jouer");
  return { success: true, token: data as string };
}

export async function deleteCalendarToken(): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_feeds").delete().eq("user_id", user.id);
  if (error) {
    console.error("Error deleting calendar feed:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }
  revalidatePath("/jouer");
  return { success: true };
}
