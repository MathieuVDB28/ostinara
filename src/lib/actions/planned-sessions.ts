"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { notifyPlannedEvent } from "@/lib/notifications/planned-sessions";
import { MAX_SERIES_OCCURRENCES, moveLike, occurrences } from "@/lib/rehearsal-series";
import { safeTimeZone } from "@/lib/time-zone";
import type { PlannedItem, PlannedRemind, PlannedSession, PlannedSessionInput, PlannedSessionPerson } from "@/types";

type Result = { success: boolean; error?: string };

const SELECT = `
  id, user_id, series_id, starts_at, duration_minutes, time_zone, title, note, location,
  instrument, routine_id, setlist_id, items,
  people:planned_session_people(
    user_id, role, rsvp, state, remind_minutes,
    profile:profiles(id, username, display_name, avatar_url)
  )
` as const;

/** Les rates restent proposes trois jours. */
const MISSED_DAYS = 3;

/** Mes sessions planifiees et mes invitations, de la plus proche a la plus lointaine. */
export async function getPlannedSessions(): Promise<PlannedSession[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planned_sessions")
    .select(SELECT)
    .gte("starts_at", new Date(Date.now() - MISSED_DAYS * 86_400_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("Error fetching planned sessions:", error);
    return [];
  }

  return (data ?? []).flatMap((row): PlannedSession[] => {
    const { people, ...session } = row as unknown as Omit<PlannedSession, "me" | "other"> & { people: PlannedSessionPerson[] };
    const me = people.find((person) => person.user_id === user.id);
    if (!me) return [];
    return [{ ...session, me, other: people.find((person) => person.user_id !== user.id) ?? null }];
  });
}

const ERRORS = {
  planned_limit: "plannedLimit",
  planned_series_paid: "plannedSeriesPaid",
  planned_guest_paid: "plannedGuestPaid",
  planned_guest_friend: "plannedGuestFriend",
  planned_past: "plannedPast",
} as const;

async function failure(error: { message?: string } | null): Promise<Result> {
  console.error("Planned session:", error);
  const key = Object.keys(ERRORS).find((code) => error?.message?.includes(code)) as keyof typeof ERRORS | undefined;
  return { success: false, error: await tErr(key ? ERRORS[key] : "updateFailed") };
}

async function myName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("username, display_name").eq("id", userId).single();
  return data?.display_name || data?.username || null;
}

const ITEM_TEXT = 200;
function cleanItem(item: PlannedItem): PlannedItem {
  return {
    item_type: item.item_type === "song" ? "song" : "exercise",
    song_id: item.song_id,
    song_title: item.song_title?.slice(0, ITEM_TEXT),
    song_artist: item.song_artist?.slice(0, ITEM_TEXT),
    song_cover_url: item.song_cover_url,
    exercise_id: item.exercise_id,
    exercise_name: item.exercise_name?.slice(0, ITEM_TEXT),
    exercise_category: item.exercise_category,
    bpm: item.bpm,
  };
}

function rowOf(input: PlannedSessionInput, timeZone: string) {
  return {
    title: input.title.trim().slice(0, 80),
    duration_minutes: Math.round(input.duration_minutes),
    time_zone: timeZone,
    note: input.note?.trim().slice(0, 500) || null,
    location: input.location?.trim().slice(0, 200) || null,
    instrument: input.instrument ?? null,
    routine_id: input.routine_id ?? null,
    setlist_id: input.setlist_id ?? null,
    items: input.items.slice(0, 100).map(cleanItem),
  };
}

function isValid(input: PlannedSessionInput): boolean {
  return (
    Boolean(input.title.trim()) &&
    !Number.isNaN(new Date(input.starts_at).getTime()) &&
    input.duration_minutes >= 5 &&
    input.duration_minutes <= 720
  );
}

export async function createPlannedSession(input: PlannedSessionInput): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  if (!isValid(input)) return { success: false, error: await tErr("plannedInvalid") };

  const timeZone = safeTimeZone(input.time_zone);
  const start = new Date(input.starts_at);
  const starts = input.weekdays?.length && input.until ? occurrences(start, input.weekdays, input.until, timeZone) : [start];
  if (starts.length > MAX_SERIES_OCCURRENCES) return { success: false, error: await tErr("plannedSeriesTooLong") };

  const supabase = await createClient();
  const row = rowOf(input, timeZone);
  const { data: ids, error } = await supabase.rpc("create_planned_sessions", {
    p_data: row,
    p_starts: starts.map((date) => date.toISOString()),
    p_guest: input.guest_id ?? null,
    p_remind: input.remind_minutes,
  });
  if (error || !ids?.length) return failure(error);

  if (input.guest_id) {
    await notifyPlannedEvent(
      "plannedInvited",
      input.guest_id,
      { id: ids[0], title: row.title, starts_at: start.toISOString(), time_zone: timeZone },
      await myName(user.id),
      starts.length
    );
  }
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}

/** Modifier ou reporter, seule ou avec la suite de la serie. L'organisateur seulement. */
export async function updatePlannedSession(
  id: string,
  input: PlannedSessionInput,
  scope: "one" | "following" = "one"
): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  if (!isValid(input)) return { success: false, error: await tErr("plannedInvalid") };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("planned_sessions")
    .select("id, user_id, series_id, starts_at, time_zone, people:planned_session_people(user_id, role, rsvp)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { success: false, error: await tErr("updateFailed") };

  const timeZone = safeTimeZone(current.time_zone);
  const from = new Date(current.starts_at);
  const to = new Date(input.starts_at);
  const moved = from.getTime() !== to.getTime();

  const targets = [{ id: current.id as string, starts_at: to.toISOString() }];
  if (scope === "following" && current.series_id) {
    const { data: followers, error } = await supabase
      .from("planned_sessions")
      .select("id, starts_at, people:planned_session_people!inner(state)")
      .eq("series_id", current.series_id)
      .eq("people.user_id", user.id)
      .eq("people.state", "planned")
      .gt("starts_at", current.starts_at)
      .order("starts_at", { ascending: true });
    if (error) return failure(error);
    for (const row of followers ?? []) {
      const date = moved ? moveLike(new Date(row.starts_at), from, to, timeZone) : new Date(row.starts_at);
      targets.push({ id: row.id, starts_at: date.toISOString() });
    }
  }

  const row = rowOf(input, timeZone);
  const { error } = await supabase.rpc("update_planned_sessions", {
    p_data: row,
    p_starts: targets,
    p_guest: input.guest_id ?? null,
    p_remind: input.remind_minutes,
  });
  if (error) return failure(error);

  const people = current.people as { user_id: string; role: string; rsvp: string }[];
  const before = people.find((person) => person.role === "guest");
  const guest = input.guest_id ?? null;
  const session = { id, title: row.title, starts_at: to.toISOString(), time_zone: timeZone };
  const name = await myName(user.id);
  if (before && before.user_id !== guest && before.rsvp !== "declined" && from > new Date()) {
    await notifyPlannedEvent("plannedCancelled", before.user_id, { ...session, starts_at: from.toISOString() }, name);
  }
  if (guest && guest !== before?.user_id) {
    await notifyPlannedEvent("plannedInvited", guest, session, name, targets.length);
  } else if (guest && moved) {
    await notifyPlannedEvent("plannedMoved", guest, session, name, targets.length);
  }
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}

export async function deletePlannedSession(id: string, scope: "one" | "following" = "one"): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("planned_sessions")
    .select("id, title, series_id, starts_at, time_zone, people:planned_session_people(user_id, role, rsvp)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { success: false, error: await tErr("deleteFailed") };

  const base = supabase.from("planned_sessions").delete().eq("user_id", user.id);
  const { error } = await (scope === "following" && current.series_id
    ? base.eq("series_id", current.series_id).gte("starts_at", current.starts_at)
    : base.eq("id", id));
  if (error) {
    console.error("Error deleting planned session:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  const guest = (current.people as { user_id: string; role: string; rsvp: string }[]).find(
    (person) => person.role === "guest" && person.rsvp !== "declined"
  );
  if (guest && new Date(current.starts_at) > new Date()) {
    await notifyPlannedEvent("plannedCancelled", guest.user_id, current, await myName(user.id));
  }
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}

/** Repondre a une invitation ; l'organisateur est prevenu. */
export async function answerPlannedSession(id: string, accept: boolean, timeZone: string): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("planned_sessions")
    .select("id, user_id, title, starts_at, time_zone")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.rpc("answer_planned_session", {
    p_id: id,
    p_accept: accept,
    p_time_zone: safeTimeZone(timeZone),
  });
  if (error || !session) return failure(error);

  await notifyPlannedEvent(accept ? "plannedAccepted" : "plannedDeclined", session.user_id, session, await myName(user.id));
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}

/** Passer sa seance, ou la reprendre. */
export async function skipPlannedSession(id: string, skipped: boolean): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_planned_session_state", { p_id: id, p_skipped: skipped });
  if (error) return failure(error);
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}

/** Le rappel de l'invite : le sien, sans toucher a celui de l'organisateur. */
export async function setPlannedReminder(id: string, remind: PlannedRemind): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_planned_session_reminder", { p_id: id, p_remind: remind });
  if (error) return failure(error);
  revalidatePath("/jouer");
  revalidatePath("/accueil");
  return { success: true };
}
