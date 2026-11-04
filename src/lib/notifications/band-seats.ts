import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { sendPushNotification } from "./send-push";

/**
 * Les notifications des places du plan Band. Les places se lisent hors RLS :
 * le webhook Stripe n'a pas d'utilisateur connecte.
 */

const SUBSCRIPTION_URL = "/account/subscription";

function admin() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function nameOf(userId: string): Promise<string | null> {
  const { data } = await admin()
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || data?.username || null;
}

export async function notifySeatInvited(memberId: string, ownerId: string): Promise<void> {
  const name = await nameOf(ownerId);
  await sendPushNotification(
    memberId,
    (t) => ({
      title: t("bandSeat.invitedTitle"),
      body: t("bandSeat.invitedBody", { name: name ?? t("someFriend") }),
      data: { url: SUBSCRIPTION_URL },
    }),
    "band_seat_invited"
  );
}

export async function notifySeatAccepted(ownerId: string, memberId: string): Promise<void> {
  const name = await nameOf(memberId);
  await sendPushNotification(
    ownerId,
    (t) => ({
      title: t("bandSeat.acceptedTitle"),
      body: t("bandSeat.acceptedBody", { name: name ?? t("someFriend") }),
      data: { url: SUBSCRIPTION_URL },
    }),
    "band_seat_accepted"
  );
}

/** La place est retiree : la personne repasse en Free, elle doit le savoir. */
export async function notifySeatRemoved(memberId: string, ownerId: string): Promise<void> {
  const name = await nameOf(ownerId);
  await sendPushNotification(
    memberId,
    (t) => ({
      title: t("bandSeat.removedTitle"),
      body: t("bandSeat.removedBody", { name: name ?? t("someFriend") }),
      data: { url: SUBSCRIPTION_URL },
    }),
    "band_seat_removed"
  );
}

/** Les personnes installees sur le plan d'un titulaire. */
export async function activeSeatMembers(ownerId: string): Promise<string[]> {
  const { data } = await admin()
    .from("band_plan_seats")
    .select("member_id")
    .eq("owner_id", ownerId)
    .eq("status", "active");
  return (data ?? []).map((row) => row.member_id as string);
}
