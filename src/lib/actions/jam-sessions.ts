"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers } from "@/lib/notifications";
import type {
  JamSession,
  JamSessionWithDetails,
  JamSessionMessage,
  JamSessionMessageWithProfile,
  JamSessionParticipantWithProfile,
  SetlistWithDetails,
} from "@/types";

// === Check if user has Band plan ===
async function hasBandPlan(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return profile?.plan === "band";
}

// === Create a jam session ===
export async function createJamSession(
  bandId: string,
  setlistId?: string
): Promise<{ success: boolean; error?: string; session?: JamSession }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check Band plan
  const hasPlan = await hasBandPlan();
  if (!hasPlan) {
    return {
      success: false,
      error: "Tu dois avoir le plan Band pour demarrer une Jam",
    };
  }

  // Check band membership
  const { data: membership } = await supabase
    .from("band_members")
    .select("id")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Tu n'es pas membre de ce groupe" };
  }

  // Check for existing active session
  const { data: existingSession } = await supabase
    .from("jam_sessions")
    .select("id")
    .eq("band_id", bandId)
    .in("status", ["waiting", "active", "paused"])
    .single();

  if (existingSession) {
    return { success: false, error: "Une session Jam est deja en cours" };
  }

  // Get first song from setlist if provided
  let currentSong: {
    song_id: string | null;
    song_title: string | null;
    song_artist: string | null;
  } | null = null;

  if (setlistId) {
    const { data: firstItem } = await supabase
      .from("setlist_items")
      .select("song_id, song_title, song_artist")
      .eq("setlist_id", setlistId)
      .eq("item_type", "song")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (firstItem) {
      currentSong = firstItem;
    }
  }

  // Create session
  const { data: session, error } = await supabase
    .from("jam_sessions")
    .insert({
      band_id: bandId,
      host_id: user.id,
      setlist_id: setlistId || null,
      status: "waiting",
      current_song_index: currentSong ? 0 : null,
      current_song_id: currentSong?.song_id || null,
      current_song_title: currentSong?.song_title || null,
      current_song_artist: currentSong?.song_artist || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating jam session:", error);
    return { success: false, error: "Erreur lors de la creation de la session" };
  }

  // Add host as first participant
  await supabase.from("jam_session_participants").insert({
    session_id: session.id,
    user_id: user.id,
  });

  // Notify band members
  const { data: members } = await supabase
    .from("band_members")
    .select("user_id")
    .eq("band_id", bandId)
    .neq("user_id", user.id);

  const { data: band } = await supabase
    .from("bands")
    .select("name")
    .eq("id", bandId)
    .single();

  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (members && members.length > 0) {
    const hostName =
      hostProfile?.display_name || hostProfile?.username || "Un membre";
    const notifications = members.map((m) => ({
      userId: m.user_id,
      payload: {
        title: "Jam Session demarre !",
        body: `${hostName} a demarre une Jam Session dans ${band?.name}`,
        data: { url: `/jam/${session.id}` },
      },
      notificationType: "jam_session_started" as const,
    }));

    await sendPushNotificationToMultipleUsers(notifications);
  }

  revalidatePath("/setlists");
  return { success: true, session: session as JamSession };
}

// === Get active jam session for band ===
export async function getActiveJamSession(
  bandId: string
): Promise<JamSessionWithDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("jam_sessions")
    .select(
      `
      *,
      band:bands(*),
      host:profiles!jam_sessions_host_id_fkey(id, username, display_name, avatar_url, plan),
      participants:jam_session_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `
    )
    .eq("band_id", bandId)
    .in("status", ["waiting", "active", "paused"])
    .single();

  if (error || !data) return null;

  // Get setlist if present
  let setlist: SetlistWithDetails | null = null;
  if (data.setlist_id) {
    const { data: setlistData } = await supabase
      .from("setlists")
      .select(
        `
        *,
        items:setlist_items(*)
      `
      )
      .eq("id", data.setlist_id)
      .single();

    if (setlistData) {
      setlist = {
        ...setlistData,
        items: setlistData.items || [],
        total_duration_seconds: 0,
        song_count: (setlistData.items || []).filter(
          (i: { item_type: string }) => i.item_type === "song"
        ).length,
      } as SetlistWithDetails;
    }
  }

  return {
    ...data,
    setlist,
  } as JamSessionWithDetails;
}

// === Get jam session by ID ===
export async function getJamSession(
  sessionId: string
): Promise<JamSessionWithDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("jam_sessions")
    .select(
      `
      *,
      band:bands(
        *,
        members:band_members(
          *,
          profile:profiles(id, username, display_name, avatar_url, plan)
        )
      ),
      host:profiles!jam_sessions_host_id_fkey(id, username, display_name, avatar_url, plan),
      participants:jam_session_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `
    )
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;

  // Get setlist if present
  let setlist: SetlistWithDetails | null = null;
  if (data.setlist_id) {
    const { data: setlistData } = await supabase
      .from("setlists")
      .select(
        `
        *,
        items:setlist_items(*)
      `
      )
      .eq("id", data.setlist_id)
      .single();

    if (setlistData) {
      setlist = {
        ...setlistData,
        items: setlistData.items || [],
        total_duration_seconds: 0,
        song_count: (setlistData.items || []).filter(
          (i: { item_type: string }) => i.item_type === "song"
        ).length,
      } as SetlistWithDetails;
    }
  }

  return {
    ...data,
    setlist,
  } as JamSessionWithDetails;
}

// === Join jam session ===
export async function joinJamSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check if already participant
  const { data: existing } = await supabase
    .from("jam_session_participants")
    .select("id, is_active")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    if (existing.is_active) {
      return { success: true }; // Already joined
    }
    // Reactivate
    await supabase
      .from("jam_session_participants")
      .update({ is_active: true, left_at: null })
      .eq("id", existing.id);
    return { success: true };
  }

  const { error } = await supabase.from("jam_session_participants").insert({
    session_id: sessionId,
    user_id: user.id,
  });

  if (error) {
    console.error("Error joining jam session:", error);
    return { success: false, error: "Erreur lors de la connexion" };
  }

  return { success: true };
}

// === Leave jam session ===
export async function leaveJamSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("jam_session_participants")
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error leaving jam session:", error);
    return { success: false, error: "Erreur lors de la deconnexion" };
  }

  return { success: true };
}

// === Update jam session state ===
export async function updateJamSessionState(
  sessionId: string,
  updates: {
    status?: "waiting" | "active" | "paused" | "ended";
    bpm?: number;
    time_signature_beats?: number;
    time_signature_value?: number;
    is_metronome_playing?: boolean;
    current_song_index?: number | null;
    current_song_id?: string | null;
    current_song_title?: string | null;
    current_song_artist?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const updateData: Record<string, unknown> = { ...updates };

  if (updates.status === "active") {
    // Get current session to check if already started
    const { data: current } = await supabase
      .from("jam_sessions")
      .select("started_at")
      .eq("id", sessionId)
      .single();

    if (!current?.started_at) {
      updateData.started_at = new Date().toISOString();
    }
  }
  if (updates.status === "ended") {
    updateData.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("jam_sessions")
    .update(updateData)
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating jam session:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  return { success: true };
}

// === End jam session ===
export async function endJamSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await updateJamSessionState(sessionId, { status: "ended" });
  if (result.success) {
    revalidatePath("/setlists");
  }
  return result;
}

// === Send chat message ===
export async function sendJamMessage(
  sessionId: string,
  content: string
): Promise<{ success: boolean; error?: string; message?: JamSessionMessage }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  if (!content.trim()) {
    return { success: false, error: "Message vide" };
  }

  const { data: message, error } = await supabase
    .from("jam_session_messages")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Erreur lors de l'envoi" };
  }

  return { success: true, message: message as JamSessionMessage };
}

// === Get chat messages ===
export async function getJamMessages(
  sessionId: string,
  limit = 100
): Promise<JamSessionMessageWithProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jam_session_messages")
    .select(
      `
      *,
      profile:profiles(id, username, display_name, avatar_url)
    `
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data as JamSessionMessageWithProfile[];
}

// === Get band setlists for jam session ===
export async function getBandSetlistsForJam(
  bandId: string
): Promise<SetlistWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      items:setlist_items(*)
    `
    )
    .eq("band_id", bandId)
    .eq("is_personal", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching band setlists:", error);
    return [];
  }

  return (data || []).map((setlist) => ({
    ...setlist,
    items: setlist.items || [],
    total_duration_seconds: 0,
    song_count: (setlist.items || []).filter(
      (i: { item_type: string }) => i.item_type === "song"
    ).length,
  })) as SetlistWithDetails[];
}
