"use server";

import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { BandMessageWithProfile } from "@/types";

// === Get band messages (general chat or rehearsal thread) ===
export async function getBandMessages(
  bandId: string,
  rehearsalId?: string | null,
  limit: number = 50,
  offset: number = 0
): Promise<BandMessageWithProfile[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  let query = supabase
    .from("band_messages")
    .select(`
      *,
      profile:profiles(id, username, display_name, avatar_url, plan)
    `)
    .eq("band_id", bandId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (rehearsalId) {
    query = query.eq("rehearsal_id", rehearsalId);
  } else {
    query = query.is("rehearsal_id", null);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error("Error fetching band messages:", error);
    return [];
  }

  return messages as BandMessageWithProfile[];
}

// === Send band message ===
export async function sendBandMessage(
  bandId: string,
  content: string,
  rehearsalId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  // Verify band membership
  const { data: membership } = await supabase
    .from("band_members")
    .select("id")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { success: false, error: await tErr("notBandMember") };

  const { error } = await supabase
    .from("band_messages")
    .insert({
      band_id: bandId,
      rehearsal_id: rehearsalId || null,
      user_id: user.id,
      content,
    });

  if (error) {
    console.error("Error sending band message:", error);
    return { success: false, error: await tErr("messageSendFailed") };
  }

  return { success: true };
}

// === Delete own message ===
export async function deleteBandMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { error } = await supabase
    .from("band_messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  return { success: true };
}
