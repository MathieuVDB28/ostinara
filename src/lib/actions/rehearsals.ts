"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers } from "@/lib/notifications";
import type {
  Rehearsal,
  RehearsalWithDetails,
  RehearsalParticipantWithProfile,
  CreateRehearsalInput,
  UpdateRehearsalInput,
  RehearsalRsvpStatus,
  RecurrenceType,
} from "@/types";

// === Check band membership ===
async function isBandMember(bandId: string): Promise<{ isMember: boolean; userId: string | null }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { isMember: false, userId: null };

  const { data: membership } = await supabase
    .from("band_members")
    .select("id")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .single();

  return { isMember: !!membership, userId: user.id };
}

// === Get band rehearsals ===
export async function getBandRehearsals(bandId: string): Promise<RehearsalWithDetails[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const { data: rehearsals, error } = await supabase
    .from("rehearsals")
    .select(`
      *,
      band:bands(*, members:band_members(user_id, instrument, instrument_label)),
      setlist:setlists(id, name, description),
      creator:profiles!rehearsals_created_by_fkey(id, username, display_name, avatar_url, plan),
      participants:rehearsal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `)
    .eq("band_id", bandId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching rehearsals:", error);
    return [];
  }

  return rehearsals as RehearsalWithDetails[];
}

// === Get single rehearsal ===
export async function getRehearsal(rehearsalId: string): Promise<RehearsalWithDetails | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: rehearsal, error } = await supabase
    .from("rehearsals")
    .select(`
      *,
      band:bands(*, members:band_members(user_id, instrument, instrument_label)),
      setlist:setlists(id, name, description),
      creator:profiles!rehearsals_created_by_fkey(id, username, display_name, avatar_url, plan),
      participants:rehearsal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `)
    .eq("id", rehearsalId)
    .single();

  if (error) {
    console.error("Error fetching rehearsal:", error);
    return null;
  }

  // Get message count
  const { count } = await supabase
    .from("band_messages")
    .select("*", { count: "exact", head: true })
    .eq("rehearsal_id", rehearsalId);

  return {
    ...rehearsal,
    message_count: count || 0,
  } as RehearsalWithDetails;
}

// === Get user's upcoming rehearsals across all bands ===
export async function getUpcomingRehearsals(): Promise<RehearsalWithDetails[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  // Get all bands user is member of
  const { data: memberships } = await supabase
    .from("band_members")
    .select("band_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const bandIds = memberships.map((m) => m.band_id);

  const { data: rehearsals, error } = await supabase
    .from("rehearsals")
    .select(`
      *,
      band:bands(*, members:band_members(user_id, instrument, instrument_label)),
      setlist:setlists(id, name, description),
      creator:profiles!rehearsals_created_by_fkey(id, username, display_name, avatar_url, plan),
      participants:rehearsal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `)
    .in("band_id", bandIds)
    .eq("status", "scheduled")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error fetching upcoming rehearsals:", error);
    return [];
  }

  return rehearsals as RehearsalWithDetails[];
}

/**
 * Les setlists des prochaines repetes, une par setlist.
 *
 * Le pont « cover postee -> repete » : un morceau qu'on vient d'enregistrer
 * est pret a etre joue en groupe. Seules les repetes qui ont deja une
 * setlist comptent — sans elle, il n'y a nulle part ou le ranger.
 */
export async function getUpcomingRehearsalSetlists(): Promise<
  { rehearsalId: string; title: string; date: string; bandName: string; setlistId: string; setlistName: string }[]
> {
  const rehearsals = await getUpcomingRehearsals();
  const seen = new Set<string>();
  const targets = [];

  for (const rehearsal of rehearsals) {
    if (!rehearsal.setlist || seen.has(rehearsal.setlist.id)) continue;
    seen.add(rehearsal.setlist.id);
    targets.push({
      rehearsalId: rehearsal.id,
      title: rehearsal.title,
      date: rehearsal.date,
      bandName: rehearsal.band?.name ?? "Groupe",
      setlistId: rehearsal.setlist.id,
      setlistName: rehearsal.setlist.name,
    });
  }

  return targets.slice(0, 3);
}

// === Helper: generate recurrence dates ===
function generateRecurrenceDates(
  startDate: Date,
  recurrence: RecurrenceType,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  // Skip the first date (already created as the parent)
  switch (recurrence) {
    case "weekly":
      current.setDate(current.getDate() + 7);
      break;
    case "biweekly":
      current.setDate(current.getDate() + 14);
      break;
    case "monthly":
      current.setMonth(current.getMonth() + 1);
      break;
    default:
      return dates;
  }

  while (current <= endDate) {
    dates.push(new Date(current));
    switch (recurrence) {
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "biweekly":
        current.setDate(current.getDate() + 14);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return dates;
}

// === Create rehearsal ===
export async function createRehearsal(
  input: CreateRehearsalInput
): Promise<{ success: boolean; error?: string; rehearsal?: Rehearsal }> {
  const { isMember, userId } = await isBandMember(input.band_id);
  if (!userId) return { success: false, error: "Non authentifie" };
  if (!isMember) return { success: false, error: "Tu n'es pas membre de ce groupe" };

  const supabase = await createClient();

  // Calculate day of week from date
  const dateObj = new Date(input.date);
  const dayOfWeek = dateObj.getDay();

  // Create parent rehearsal
  const { data: rehearsal, error } = await supabase
    .from("rehearsals")
    .insert({
      band_id: input.band_id,
      setlist_id: input.setlist_id || null,
      created_by: userId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      location_url: input.location_url || null,
      date: input.date,
      end_date: input.end_date || null,
      recurrence: input.recurrence,
      recurrence_day_of_week: input.recurrence !== "none" ? dayOfWeek : null,
      recurrence_end_date: input.recurrence_end_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating rehearsal:", error);
    return { success: false, error: "Erreur lors de la creation de la repetition" };
  }

  // Add participants (including creator)
  const allParticipantIds = Array.from(new Set([userId, ...input.participant_ids]));
  const participantRows = allParticipantIds.map((id) => ({
    rehearsal_id: rehearsal.id,
    user_id: id,
    status: id === userId ? "accepted" as const : "invited" as const,
    responded_at: id === userId ? new Date().toISOString() : null,
  }));

  await supabase.from("rehearsal_participants").insert(participantRows);

  // Generate recurrence occurrences
  if (input.recurrence !== "none" && input.recurrence_end_date) {
    const recurrenceDates = generateRecurrenceDates(
      dateObj,
      input.recurrence,
      new Date(input.recurrence_end_date)
    );

    for (const occDate of recurrenceDates) {
      // Calculate end_date offset
      let occEndDate = null;
      if (input.end_date) {
        const duration = new Date(input.end_date).getTime() - dateObj.getTime();
        occEndDate = new Date(occDate.getTime() + duration).toISOString();
      }

      const { data: childRehearsal } = await supabase
        .from("rehearsals")
        .insert({
          band_id: input.band_id,
          setlist_id: input.setlist_id || null,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
          location_url: input.location_url || null,
          date: occDate.toISOString(),
          end_date: occEndDate,
          recurrence: input.recurrence,
          recurrence_day_of_week: dayOfWeek,
          parent_rehearsal_id: rehearsal.id,
        })
        .select()
        .single();

      if (childRehearsal) {
        const childParticipants = allParticipantIds.map((id) => ({
          rehearsal_id: childRehearsal.id,
          user_id: id,
          status: id === userId ? "accepted" as const : "invited" as const,
          responded_at: id === userId ? new Date().toISOString() : null,
        }));
        await supabase.from("rehearsal_participants").insert(childParticipants);
      }
    }
  }

  // Send notifications to invited participants
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .single();

  const creatorName = creatorProfile?.display_name || creatorProfile?.username || "Quelqu'un";
  const notifiedIds = input.participant_ids.filter((id) => id !== userId);

  if (notifiedIds.length > 0) {
    const formattedDate = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);

    await sendPushNotificationToMultipleUsers(
      notifiedIds.map((id) => ({
        userId: id,
        payload: {
          title: "Nouvelle repetition",
          body: `${creatorName} t'invite a une repet : ${input.title} - ${formattedDate}`,
          data: { url: `/setlists/rehearsals/${rehearsal.id}` },
        },
        notificationType: "rehearsal_created",
      }))
    );
  }

  revalidatePath("/setlists");
  return { success: true, rehearsal: rehearsal as Rehearsal };
}

// === Update rehearsal ===
export async function updateRehearsal(
  rehearsalId: string,
  input: UpdateRehearsalInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifie" };

  // Get current rehearsal to check band membership
  const { data: current } = await supabase
    .from("rehearsals")
    .select("band_id, title, date")
    .eq("id", rehearsalId)
    .single();

  if (!current) return { success: false, error: "Repetition non trouvee" };

  const { isMember } = await isBandMember(current.band_id);
  if (!isMember) return { success: false, error: "Tu n'es pas membre de ce groupe" };

  const { error } = await supabase
    .from("rehearsals")
    .update(input)
    .eq("id", rehearsalId);

  if (error) {
    console.error("Error updating rehearsal:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  // Notify participants of changes (except the one who made the change)
  const { data: participants } = await supabase
    .from("rehearsal_participants")
    .select("user_id")
    .eq("rehearsal_id", rehearsalId)
    .neq("user_id", user.id);

  if (participants && participants.length > 0) {
    const { data: updaterProfile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();

    const updaterName = updaterProfile?.display_name || updaterProfile?.username || "Quelqu'un";

    await sendPushNotificationToMultipleUsers(
      participants.map((p) => ({
        userId: p.user_id,
        payload: {
          title: "Repetition modifiee",
          body: `${updaterName} a modifie la repet "${current.title}"`,
          data: { url: `/setlists/rehearsals/${rehearsalId}` },
        },
        notificationType: "rehearsal_updated",
      }))
    );
  }

  revalidatePath("/setlists");
  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  return { success: true };
}

// === Cancel rehearsal ===
export async function cancelRehearsal(
  rehearsalId: string
): Promise<{ success: boolean; error?: string }> {
  return updateRehearsal(rehearsalId, { status: "cancelled" });
}

// === Complete rehearsal ===
export async function completeRehearsal(
  rehearsalId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return updateRehearsal(rehearsalId, { status: "completed", notes });
}

// === Delete rehearsal (and all children if recurrent) ===
export async function deleteRehearsal(
  rehearsalId: string,
  deleteAll: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifie" };

  if (deleteAll) {
    // Delete all children first, then parent
    const { data: rehearsal } = await supabase
      .from("rehearsals")
      .select("parent_rehearsal_id")
      .eq("id", rehearsalId)
      .single();

    const parentId = rehearsal?.parent_rehearsal_id || rehearsalId;

    // Delete children
    await supabase
      .from("rehearsals")
      .delete()
      .eq("parent_rehearsal_id", parentId);

    // Delete parent
    await supabase
      .from("rehearsals")
      .delete()
      .eq("id", parentId);
  } else {
    const { error } = await supabase
      .from("rehearsals")
      .delete()
      .eq("id", rehearsalId);

    if (error) {
      console.error("Error deleting rehearsal:", error);
      return { success: false, error: "Erreur lors de la suppression" };
    }
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === RSVP to rehearsal ===
export async function respondToRehearsal(
  rehearsalId: string,
  status: RehearsalRsvpStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase
    .from("rehearsal_participants")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error responding to rehearsal:", error);
    return { success: false, error: "Erreur lors de la reponse" };
  }

  revalidatePath("/setlists");
  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  return { success: true };
}

// === Add participant to rehearsal ===
export async function addRehearsalParticipant(
  rehearsalId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { data: rehearsal } = await supabase
    .from("rehearsals")
    .select("band_id, title, date")
    .eq("id", rehearsalId)
    .single();

  if (!rehearsal) return { success: false, error: "Repetition non trouvee" };

  const { error } = await supabase
    .from("rehearsal_participants")
    .insert({
      rehearsal_id: rehearsalId,
      user_id: participantId,
      status: "invited",
    });

  if (error) {
    console.error("Error adding participant:", error);
    return { success: false, error: "Erreur lors de l'ajout du participant" };
  }

  // Notify the added participant
  const { data: adderProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const adderName = adderProfile?.display_name || adderProfile?.username || "Quelqu'un";

  await sendPushNotificationToMultipleUsers([{
    userId: participantId,
    payload: {
      title: "Ajout a une repetition",
      body: `${adderName} t'a ajoute a la repet "${rehearsal.title}"`,
      data: { url: `/setlists/rehearsals/${rehearsalId}` },
    },
    notificationType: "rehearsal_created",
  }]);

  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  return { success: true };
}

// === Remove participant ===
export async function removeRehearsalParticipant(
  rehearsalId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase
    .from("rehearsal_participants")
    .delete()
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", participantId);

  if (error) {
    console.error("Error removing participant:", error);
    return { success: false, error: "Erreur lors du retrait du participant" };
  }

  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  return { success: true };
}
