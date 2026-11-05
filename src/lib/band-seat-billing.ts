import { createClient } from "@supabase/supabase-js";
import { getPlanFromPriceId } from "@/lib/stripe/config";
import { getStripeServer } from "@/lib/stripe/server";

/**
 * Un abonne Pro qui prend une place du plan Band : son abonnement s'arrete a la
 * fin de sa periode, et il retrouve ce qu'il a paye s'il perd la place avant.
 */

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function subscriptionIdOf(userId: string): Promise<string | null> {
  const { data } = await admin()
    .from("profile_private")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.stripe_subscription_id as string | null | undefined) ?? null;
}

/** L'abonnement a arreter, s'il y en a un : a passer ensuite a `resumeSubscription` si besoin. */
export async function stopRenewal(userId: string): Promise<string | null> {
  const subscriptionId = await subscriptionIdOf(userId);
  if (!subscriptionId) return null;
  await getStripeServer().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  return subscriptionId;
}

export async function resumeSubscription(subscriptionId: string): Promise<void> {
  await getStripeServer().subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

export async function holdsActiveSeat(userId: string): Promise<boolean> {
  const { count } = await admin()
    .from("band_plan_seats")
    .select("id", { count: "exact", head: true })
    .eq("member_id", userId)
    .eq("status", "active");
  return (count ?? 0) > 0;
}

/** La place vient de tomber (le trigger a remis Free) : rend le plan encore paye. */
export async function restorePaidPlan(userId: string): Promise<void> {
  try {
    const subscriptionId = await subscriptionIdOf(userId);
    if (!subscriptionId) return;
    const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "active" && subscription.status !== "trialing") return;
    const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id ?? "");
    if (plan !== "free") await admin().from("profiles").update({ plan }).eq("id", userId);
  } catch (error) {
    console.error("Error restoring paid plan:", error);
  }
}
