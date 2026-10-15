"use server";

import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { syncBadges } from "@/lib/badges/sync";
import { buildBadgeStatuses, type BadgeStatus, type UserBadgeRow } from "@/lib/badges/catalog";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key);
}

/**
 * Ses propres badges, avec la progression vers le niveau suivant.
 * La lecture verifie au passage ce qui a pu etre debloque depuis.
 */
export async function getMyBadges(): Promise<BadgeStatus[]> {
  return (await syncBadges({ revalidate: false })) ?? buildBadgeStatuses([]);
}

/** Les badges obtenus par un ami — sans progression, qui reste privee. */
export async function getUserBadges(userId: string): Promise<BadgeStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, level, period, unlocked_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user badges:", error);
    return [];
  }

  return buildBadgeStatuses((data ?? []) as UserBadgeRow[]);
}

/** Les badges debloques dont le toast n'a pas encore ete montre. */
export async function getUnseenBadges(): Promise<UserBadgeRow[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_badges")
    .select("id, badge_id, level, period, unlocked_at")
    .eq("user_id", user.id)
    .is("seen_at", null)
    .order("unlocked_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("Error fetching unseen badges:", error);
    return [];
  }

  return (data ?? []) as UserBadgeRow[];
}

export async function markBadgesSeen(ids: string[]): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user || ids.length === 0) return;

  const { error } = await getServiceRoleSupabase()
    .from("user_badges")
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) console.error("Error marking badges seen:", error);
}
