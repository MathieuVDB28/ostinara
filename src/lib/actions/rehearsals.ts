"use server";

import { getTranslations } from "next-intl/server";
import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers, type PushT } from "@/lib/notifications";
import { notifyRehearsalEvent, rehearsalRecipients } from "@/lib/notifications/rehearsals";
import { MAX_SERIES_OCCURRENCES, endAfter, moveLike, seriesDates } from "@/lib/rehearsal-series";
import { safeTimeZone, toWallTime } from "@/lib/time-zone";
import type {
  Rehearsal,
  RehearsalWithDetails,
  CreateRehearsalInput,
  UpdateRehearsalInput,
  RehearsalRsvpStatus,
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
      bandName: rehearsal.band?.name ?? (await getTranslations("common"))("band"),
      setlistId: rehearsal.setlist.id,
      setlistName: rehearsal.setlist.name,
    });
  }

  return targets.slice(0, 3);
}

async function myName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("username, display_name").eq("id", userId).single();
  return data?.display_name || data?.username || null;
}

/** L'auteur, le titulaire et les admins. La base refuse les autres (check_rehearsal_edit). */
async function canManageRehearsal(rehearsal: { band_id: string; created_by: string }, userId: string): Promise<boolean> {
  if (rehearsal.created_by === userId) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("band_members")
    .select("role")
    .eq("band_id", rehearsal.band_id)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "owner" || data?.role === "admin";
}

/** 0 = dimanche, au mur. */
function toWeekday(date: Date, timeZone: string): number {
  const { year, month, day } = toWallTime(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function revalidateRehearsal(bandId: string, rehearsalId?: string) {
  revalidatePath("/setlists");
  revalidatePath("/commu/groupes");
  revalidatePath(`/commu/groupes/${bandId}`);
  if (rehearsalId) revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
}

// === Create rehearsal ===
export async function createRehearsal(
  input: CreateRehearsalInput
): Promise<{ success: boolean; error?: string; rehearsal?: Rehearsal }> {
  const { isMember, userId } = await isBandMember(input.band_id);
  if (!userId) return { success: false, error: await tErr("notAuthenticated") };
  if (!isMember) return { success: false, error: await tErr("notBandMember") };

  const supabase = await createClient();

  const timeZone = safeTimeZone(input.time_zone);
  const dateObj = new Date(input.date);
  if (Number.isNaN(dateObj.getTime())) return { success: false, error: await tErr("rehearsalCreateFailed") };
  const endObj = input.end_date ? endAfter(dateObj, new Date(input.end_date), timeZone) : null;
  const dayOfWeek = toWeekday(dateObj, timeZone);

  const followingDates =
    input.recurrence !== "none" && input.recurrence_end_date
      ? seriesDates(dateObj, input.recurrence, input.recurrence_end_date, timeZone)
      : [];
  if (followingDates.length >= MAX_SERIES_OCCURRENCES - 1) {
    return { success: false, error: await tErr("rehearsalSeriesTooLong") };
  }

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
      date: dateObj.toISOString(),
      end_date: endObj?.toISOString() ?? null,
      time_zone: timeZone,
      recurrence: input.recurrence,
      recurrence_day_of_week: input.recurrence !== "none" ? dayOfWeek : null,
      recurrence_end_date: input.recurrence_end_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating rehearsal:", error);
    return { success: false, error: await tErr("rehearsalCreateFailed") };
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

  if (followingDates.length > 0) {
    const duration = endObj ? endObj.getTime() - dateObj.getTime() : null;
    const { data: children, error: childrenError } = await supabase
      .from("rehearsals")
      .insert(
        followingDates.map((date) => ({
          band_id: input.band_id,
          setlist_id: input.setlist_id || null,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
          location_url: input.location_url || null,
          date: date.toISOString(),
          end_date: duration === null ? null : new Date(date.getTime() + duration).toISOString(),
          time_zone: timeZone,
          recurrence: input.recurrence,
          recurrence_day_of_week: dayOfWeek,
          parent_rehearsal_id: rehearsal.id,
        }))
      )
      .select("id");

    if (childrenError) {
      console.error("Error creating rehearsal series:", childrenError);
      await supabase.from("rehearsals").delete().eq("id", rehearsal.id);
      return { success: false, error: await tErr("rehearsalCreateFailed") };
    }
    const { error: participantsError } = await supabase.from("rehearsal_participants").insert(
      (children ?? []).flatMap((child) => participantRows.map((row) => ({ ...row, rehearsal_id: child.id })))
    );
    if (participantsError) console.error("Error adding series participants:", participantsError);
  }

  await notifyRehearsalEvent(
    "rehearsalCreated",
    input.participant_ids.filter((id) => id !== userId),
    rehearsal as Rehearsal,
    await myName(userId)
  );

  revalidateRehearsal(input.band_id);
  return { success: true, rehearsal: rehearsal as Rehearsal };
}

// === Update rehearsal ===
/**
 * Modifier une repete a venir, seule ou avec la suite de sa serie. Deplacee,
 * elle redemande leur presence aux participants (trigger en base).
 */
export async function updateRehearsal(
  rehearsalId: string,
  input: UpdateRehearsalInput,
  scope: "one" | "following" = "one"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: current } = await supabase.from("rehearsals").select("*").eq("id", rehearsalId).single();
  if (!current) return { success: false, error: await tErr("rehearsalNotFound") };
  if (!(await canManageRehearsal(current as Rehearsal, user.id))) {
    return { success: false, error: await tErr("rehearsalEditNotAllowed") };
  }
  if (current.status !== "scheduled" || current.logged_at) {
    return { success: false, error: await tErr("updateFailed") };
  }

  const from = new Date(current.date);
  const to = new Date(input.date);
  if (Number.isNaN(to.getTime()) || !input.title.trim()) return { success: false, error: await tErr("updateFailed") };
  const moved = to.getTime() !== from.getTime();
  if (moved && to.getTime() <= Date.now()) return { success: false, error: await tErr("rehearsalInPast") };

  // Le fuseau reste celui de la repete : l'admin qui la deplace peut etre ailleurs.
  const timeZone = safeTimeZone(current.time_zone);
  const end = input.end_date ? endAfter(to, new Date(input.end_date), timeZone) : null;
  const duration = end ? end.getTime() - to.getTime() : null;
  const details = {
    title: input.title.trim(),
    description: input.description || null,
    location: input.location || null,
    location_url: input.location_url || null,
    setlist_id: input.setlist_id || null,
  };

  const targets: { id: string; date: string }[] = [{ id: rehearsalId, date: current.date }];
  if (scope === "following") {
    const { data: followers, error } = await supabase
      .from("rehearsals")
      .select("id, date")
      .eq("parent_rehearsal_id", current.parent_rehearsal_id ?? current.id)
      .eq("status", "scheduled")
      .is("logged_at", null)
      .gt("date", current.date)
      .order("date", { ascending: true });
    if (error) {
      console.error("Error fetching rehearsal series:", error);
      return { success: false, error: await tErr("updateFailed") };
    }
    targets.push(...(followers ?? []));
  }

  for (const target of targets) {
    const date = moved ? moveLike(new Date(target.date), from, to, timeZone) : new Date(target.date);
    const { data: saved, error } = await supabase
      .from("rehearsals")
      .update({
        ...details,
        date: date.toISOString(),
        end_date: duration === null ? null : new Date(date.getTime() + duration).toISOString(),
        ...(current.recurrence !== "none" ? { recurrence_day_of_week: toWeekday(date, timeZone) } : {}),
      })
      .eq("id", target.id)
      .select("id");
    if (error || !saved?.length) {
      console.error("Error updating rehearsal:", error);
      revalidateRehearsal(current.band_id, rehearsalId);
      return { success: false, error: await tErr("updateFailed") };
    }
  }

  const { data: participants } = await supabase
    .from("rehearsal_participants")
    .select("user_id")
    .eq("rehearsal_id", rehearsalId)
    .neq("user_id", user.id);
  await notifyRehearsalEvent(
    moved ? "rehearsalMoved" : "rehearsalUpdated",
    (participants ?? []).map((p) => p.user_id),
    { ...(current as Rehearsal), title: details.title, date: to.toISOString() },
    await myName(user.id),
    targets.length
  );

  revalidateRehearsal(current.band_id, rehearsalId);
  return { success: true };
}

/** Les notes du groupe : tout membre les ecrit, personne n'est derange. */
export async function updateRehearsalNotes(
  rehearsalId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data, error } = await supabase
    .from("rehearsals")
    .update({ notes: notes.trim() || null })
    .eq("id", rehearsalId)
    .select("band_id");
  if (error || !data?.length) {
    console.error("Error saving rehearsal notes:", error);
    return { success: false, error: await tErr("updateFailed") };
  }
  revalidateRehearsal(data[0].band_id, rehearsalId);
  return { success: true };
}

// === Cancel rehearsal ===
export async function cancelRehearsal(
  rehearsalId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: current } = await supabase.from("rehearsals").select("*").eq("id", rehearsalId).single();
  if (!current) return { success: false, error: await tErr("rehearsalNotFound") };
  if (!(await canManageRehearsal(current as Rehearsal, user.id))) {
    return { success: false, error: await tErr("rehearsalEditNotAllowed") };
  }

  const { data: saved, error } = await supabase
    .from("rehearsals")
    .update({ status: "cancelled" })
    .eq("id", rehearsalId)
    .eq("status", "scheduled")
    .select("id");
  if (error || !saved?.length) {
    console.error("Error cancelling rehearsal:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  if (new Date(current.date) > new Date()) {
    await notifyRehearsalEvent(
      "rehearsalCancelled",
      await expectedParticipants([rehearsalId], user.id),
      current as Rehearsal,
      await myName(user.id)
    );
  }
  revalidateRehearsal(current.band_id, rehearsalId);
  return { success: true };
}

/** Ceux qui n'ont pas dit non, sauf moi. A lire avant de supprimer. */
async function expectedParticipants(rehearsalIds: string[], exceptUserId: string): Promise<string[]> {
  if (rehearsalIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("rehearsal_participants")
    .select("user_id")
    .in("rehearsal_id", rehearsalIds)
    .neq("user_id", exceptUserId)
    .neq("status", "declined");
  return [...new Set((data ?? []).map((p) => p.user_id as string))];
}

// === Delete rehearsal (and all children if recurrent) ===
export async function deleteRehearsal(
  rehearsalId: string,
  deleteAll: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: current } = await supabase.from("rehearsals").select("*").eq("id", rehearsalId).single();
  if (!current) return { success: false, error: await tErr("rehearsalNotFound") };

  // Ce qui allait se jouer, et avec qui : illisible une fois supprime.
  const seriesId = current.parent_rehearsal_id || rehearsalId;
  const upcomingQuery = supabase
    .from("rehearsals")
    .select("id, band_id, title, date, time_zone")
    .eq("status", "scheduled")
    .is("logged_at", null)
    .gt("date", new Date().toISOString())
    .order("date", { ascending: true });
  const { data: upcoming } = await (deleteAll
    ? upcomingQuery.or(`id.eq.${seriesId},parent_rehearsal_id.eq.${seriesId}`)
    : upcomingQuery.eq("id", rehearsalId));
  const toNotify = await expectedParticipants((upcoming ?? []).map((r) => r.id), user.id);

  if (deleteAll) {
    // Delete all children first, then parent
    const parentId = seriesId;

    // Toute la serie, sauf ce qui a ete raconte : un compte rendu ne part que
    // si on supprime cette repete-la.
    const { error: childrenError } = await supabase
      .from("rehearsals")
      .delete()
      .eq("parent_rehearsal_id", parentId)
      .is("logged_at", null);

    const { error: parentError } = childrenError
      ? { error: null }
      : await supabase
          .from("rehearsals")
          .delete()
          .eq("id", parentId)
          .is("logged_at", null);

    if (childrenError || parentError) {
      console.error("Error deleting rehearsal series:", childrenError ?? parentError);
      return { success: false, error: await tErr("deleteFailed") };
    }
  } else {
    // La premiere repete d'une serie s'en va seule : la plus ancienne des
    // suivantes prend sa place, sinon elles ne formeraient plus une serie.
    const { data: followers } = await supabase
      .from("rehearsals")
      .select("id")
      .eq("parent_rehearsal_id", rehearsalId)
      .order("date", { ascending: true });

    const [nextParent, ...others] = followers ?? [];
    if (nextParent) {
      const { error: promoteError } = await supabase
        .from("rehearsals")
        .update({ parent_rehearsal_id: null })
        .eq("id", nextParent.id);
      const { error: attachError } = others.length
        ? await supabase
            .from("rehearsals")
            .update({ parent_rehearsal_id: nextParent.id })
            .in("id", others.map((rehearsal) => rehearsal.id))
        : { error: null };
      // Sans ce rattachement, elles perdent leur lien entre elles, rien d'autre.
      if (promoteError || attachError) {
        console.error("Error reattaching rehearsal series:", promoteError ?? attachError);
      }
    }

    const { error } = await supabase
      .from("rehearsals")
      .delete()
      .eq("id", rehearsalId);

    if (error) {
      console.error("Error deleting rehearsal:", error);
      return { success: false, error: await tErr("deleteFailed") };
    }
  }

  // Sans le droit de supprimer, la base n'efface rien et ne dit rien.
  const { data: left } = await supabase
    .from("rehearsals")
    .select("id")
    .in("id", (upcoming ?? []).map((r) => r.id));
  if (upcoming?.length && left?.length) return { success: false, error: await tErr("deleteFailed") };

  if (upcoming?.length) {
    await notifyRehearsalEvent("rehearsalDeleted", toNotify, upcoming[0], await myName(user.id), upcoming.length);
  }

  revalidateRehearsal(current.band_id);
  return { success: true };
}

// === RSVP to rehearsal ===
export async function respondToRehearsal(
  rehearsalId: string,
  status: RehearsalRsvpStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: before } = await supabase
    .from("rehearsal_participants")
    .select("status, rehearsal:rehearsals(id, band_id, title, date, time_zone, created_by, status)")
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: saved, error } = await supabase
    .from("rehearsal_participants")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", user.id)
    .select("id");

  if (error || !saved?.length) {
    console.error("Error responding to rehearsal:", error);
    return { success: false, error: await tErr("respondFailed") };
  }

  // L'organisateur apprend qu'il manquera quelqu'un, une seule fois.
  const rehearsal = before?.rehearsal as unknown as
    | (Pick<Rehearsal, "id" | "band_id" | "title" | "date" | "time_zone" | "created_by" | "status">)
    | null;
  if (
    rehearsal &&
    status === "declined" &&
    before?.status !== "declined" &&
    rehearsal.status === "scheduled" &&
    rehearsal.created_by !== user.id &&
    new Date(rehearsal.date) > new Date()
  ) {
    await notifyRehearsalEvent("rehearsalDeclined", [rehearsal.created_by], rehearsal, await myName(user.id));
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
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: rehearsal } = await supabase
    .from("rehearsals")
    .select("band_id, title, date")
    .eq("id", rehearsalId)
    .single();

  if (!rehearsal) return { success: false, error: await tErr("rehearsalNotFound") };

  const { error } = await supabase
    .from("rehearsal_participants")
    .insert({
      rehearsal_id: rehearsalId,
      user_id: participantId,
      status: "invited",
    });

  if (error) {
    console.error("Error adding participant:", error);
    return { success: false, error: await tErr("participantAddFailed") };
  }

  // Notify the added participant
  const { data: adderProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const adderName = adderProfile?.display_name || adderProfile?.username || null;

  const recipients = await rehearsalRecipients(rehearsal.band_id, [participantId]);
  await sendPushNotificationToMultipleUsers(recipients.map((userId) => ({
    userId,
    payload: (t: PushT) => ({
      title: t("rehearsalAdded.title"),
      body: t("rehearsalAdded.body", { name: adderName ?? t("someone"), title: rehearsal.title }),
      data: { url: `/setlists/rehearsals/${rehearsalId}` },
    }),
    notificationType: "rehearsal_created" as const,
  })));

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
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { error } = await supabase
    .from("rehearsal_participants")
    .delete()
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", participantId);

  if (error) {
    console.error("Error removing participant:", error);
    return { success: false, error: await tErr("participantRemoveFailed") };
  }

  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  return { success: true };
}
