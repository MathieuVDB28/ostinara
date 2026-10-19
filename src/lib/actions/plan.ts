"use server";

import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { UserPlan } from "@/types";

export async function requirePaidPlan(): Promise<{ allowed: boolean; plan: UserPlan; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { allowed: false, plan: "free", error: await tErr("notAuthenticated") };
  }

  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (data?.plan || "free") as UserPlan;
  if (plan === "free") {
    return { allowed: false, plan, error: await tErr("proOnly") };
  }

  return { allowed: true, plan };
}
