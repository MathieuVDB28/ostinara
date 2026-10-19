"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { TechRider, SaveTechRiderInput } from "@/types";

async function getBandMembership(bandId: string) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return { userId: "", isMember: false, role: undefined };

  const { data: member } = await supabase
    .from("band_members")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .single();

  return {
    userId: user.id,
    isMember: !!member,
    role: member?.role as string | undefined,
  };
}

export async function getTechRider(
  bandId: string
): Promise<TechRider | null> {
  const supabase = await createClient();
  const { isMember } = await getBandMembership(bandId);
  if (!isMember) return null;

  const { data } = await supabase
    .from("tech_riders")
    .select("*")
    .eq("band_id", bandId)
    .single();

  return data as TechRider | null;
}

export async function saveTechRider(
  bandId: string,
  input: SaveTechRiderInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { userId, isMember, role } = await getBandMembership(bandId);

  if (!isMember) return { success: false, error: await tErr("notBandMember") };
  if (role !== "owner" && role !== "admin")
    return { success: false, error: await tErr("forbidden") };

  const { data: existing } = await supabase
    .from("tech_riders")
    .select("id")
    .eq("band_id", bandId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("tech_riders")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("band_id", bandId);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("tech_riders").insert({
      band_id: bandId,
      created_by: userId,
      ...input,
    });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/setlists/tech-rider/${bandId}`);
  return { success: true };
}

export async function deleteTechRider(
  bandId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { isMember, role } = await getBandMembership(bandId);

  if (!isMember) return { success: false, error: await tErr("notBandMember") };
  if (role !== "owner")
    return { success: false, error: await tErr("ownerOnlyDelete") };

  const { error } = await supabase
    .from("tech_riders")
    .delete()
    .eq("band_id", bandId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/setlists/tech-rider/${bandId}`);
  return { success: true };
}
