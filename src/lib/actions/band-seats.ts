"use server";

import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  notifySeatAccepted,
  notifySeatInvited,
  notifySeatRemoved,
} from "@/lib/notifications/band-seats";
import { BAND_PLAN_SEATS, type BandSeatPerson, type BandSeatsOverview } from "@/lib/band-seats";

/**
 * Les places du plan Band. Les ecritures passent par le service role, apres
 * verification de qui agit ; les triggers tiennent `profiles.plan` a jour
 * (migration 20261117_band_plan_seats).
 */

type ActionResult = { success: boolean; error?: string };

const PERSON_COLUMNS = "id, username, display_name, avatar_url, plan";

function admin() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function refresh() {
  // Le plan vit dans le layout : badge, limites, fonctions debloquees.
  revalidatePath("/", "layout");
}

export async function getBandSeats(): Promise<BandSeatsOverview | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: seats } = await supabase
    .from("band_plan_seats")
    .select("id, owner_id, member_id, status, created_at")
    .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)
    .order("created_at", { ascending: true });

  const rows = seats ?? [];
  const peopleIds = [...new Set(rows.flatMap((seat) => [seat.owner_id as string, seat.member_id as string]))];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select(PERSON_COLUMNS).in("id", peopleIds)
    : { data: [] };
  const person = (id: string) => (people ?? []).find((entry) => entry.id === id) as BandSeatPerson | undefined;

  const withPerson = (seat: (typeof rows)[number], personId: string) => {
    const found = person(personId);
    return found ? [{ id: seat.id as string, status: seat.status as "pending" | "active", person: found }] : [];
  };

  const owned = rows.filter((seat) => seat.owner_id === user.id).flatMap((seat) => withPerson(seat, seat.member_id));
  const received = rows.filter((seat) => seat.member_id === user.id).flatMap((seat) => withPerson(seat, seat.owner_id));

  return {
    owned,
    mySeat: received.find((seat) => seat.status === "active") ?? null,
    invitations: received.filter((seat) => seat.status === "pending"),
  };
}

/** Ceux a qui offrir une place : mes amis et les membres de mes groupes. */
export async function getBandSeatCandidates(): Promise<BandSeatPerson[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const ids = await relatedPeople(user.id);
  if (ids.length === 0) return [];

  const { data } = await admin().from("profiles").select(PERSON_COLUMNS).in("id", ids);
  return (data ?? []) as BandSeatPerson[];
}

async function relatedPeople(userId: string): Promise<string[]> {
  const db = admin();
  const [{ data: friendships }, { data: myBands }] = await Promise.all([
    db
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    db.from("band_members").select("band_id").eq("user_id", userId),
  ]);

  const bandIds = (myBands ?? []).map((row) => row.band_id as string);
  const { data: bandmates } = bandIds.length
    ? await db.from("band_members").select("user_id").in("band_id", bandIds)
    : { data: [] };

  const ids = new Set<string>([
    ...(friendships ?? []).map((f) =>
      f.requester_id === userId ? (f.addressee_id as string) : (f.requester_id as string)
    ),
    ...(bandmates ?? []).map((row) => row.user_id as string),
  ]);
  ids.delete(userId);
  return [...ids];
}

export async function inviteToBandSeat(memberId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const db = admin();
  const [{ data: owner }, { count: heldSeats }, { count: takenSeats }, related] = await Promise.all([
    db.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    db
      .from("band_plan_seats")
      .select("id", { count: "exact", head: true })
      .eq("member_id", user.id)
      .eq("status", "active"),
    db.from("band_plan_seats").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    relatedPeople(user.id),
  ]);

  if (owner?.plan !== "band" || (heldSeats ?? 0) > 0) {
    return { success: false, error: await tErr("seatOwnerOnly") };
  }
  if ((takenSeats ?? 0) >= BAND_PLAN_SEATS) return { success: false, error: await tErr("seatsFull") };
  if (!related.includes(memberId)) return { success: false, error: await tErr("seatNotRelated") };

  const { error } = await db.from("band_plan_seats").insert({ owner_id: user.id, member_id: memberId });
  if (error) {
    // Deja invite (contrainte unique), ou limite atteinte entre-temps (trigger).
    console.error("Error inviting to band seat:", error);
    return { success: false, error: await tErr(error.code === "23505" ? "seatAlreadyInvited" : "seatInviteFailed") };
  }

  after(() => notifySeatInvited(memberId, user.id));
  refresh();
  return { success: true };
}

export async function respondToBandSeat(seatId: string, accept: boolean): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const db = admin();
  const { data: seat } = await db
    .from("band_plan_seats")
    .select("id, owner_id, member_id, status")
    .eq("id", seatId)
    .eq("member_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (!seat) return { success: false, error: await tErr("seatNotFound") };

  if (!accept) {
    await db.from("band_plan_seats").delete().eq("id", seatId);
    refresh();
    return { success: true };
  }

  const { data: me } = await db.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (me?.plan !== "free") return { success: false, error: await tErr("seatPlanConflict") };

  const { error } = await db
    .from("band_plan_seats")
    .update({ status: "active", responded_at: new Date().toISOString() })
    .eq("id", seatId);
  if (error) {
    console.error("Error accepting band seat:", error);
    return { success: false, error: await tErr("seatAcceptFailed") };
  }

  after(() => notifySeatAccepted(seat.owner_id as string, user.id));
  refresh();
  return { success: true };
}

/** Le titulaire reprend une place ou annule une invitation ; l'invite la rend. */
export async function releaseBandSeat(seatId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const db = admin();
  const { data: seat } = await db
    .from("band_plan_seats")
    .select("owner_id, member_id, status")
    .eq("id", seatId)
    .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)
    .maybeSingle();
  if (!seat) return { success: false, error: await tErr("seatNotFound") };

  const { error } = await db.from("band_plan_seats").delete().eq("id", seatId);
  if (error) {
    console.error("Error releasing band seat:", error);
    return { success: false, error: await tErr("seatReleaseFailed") };
  }

  if (seat.status === "active" && seat.owner_id === user.id) {
    after(() => notifySeatRemoved(seat.member_id as string, user.id));
  }
  refresh();
  return { success: true };
}
