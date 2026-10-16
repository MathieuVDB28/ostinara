"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { UserPlan } from "@/types";

export async function requirePaidPlan(): Promise<{ allowed: boolean; plan: UserPlan; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { allowed: false, plan: "free", error: "Non authentifié" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (data?.plan || "free") as UserPlan;
  if (plan === "free") {
    return { allowed: false, plan, error: "Fonctionnalité réservée aux plans Pro et Band" };
  }

  return { allowed: true, plan };
}
