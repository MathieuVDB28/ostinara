"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { INSTRUMENT_VALUES, SKILL_LEVEL_VALUES } from "@/lib/instruments";
import { PLANS } from "@/lib/stripe/config";
import type { ProfileInstrument } from "@/types";

// === Ses instruments, pour pre-remplir le choix ===
export async function getMyInstruments(): Promise<ProfileInstrument[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profile_instruments")
    .select("instrument, level, is_primary, custom_label")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching instruments:", error);
    return [];
  }
  return (data ?? []) as ProfileInstrument[];
}

// === Combien d'instruments son plan autorise (null = illimite) ===
export async function getMyInstrumentLimit(): Promise<number | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  return data?.plan === "free" || !data?.plan ? PLANS.free.limits!.instruments : null;
}

// === Remplacer ses instruments (onboarding et reglages) ===
export async function setMyInstruments(
  instruments: ProfileInstrument[],
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  if (instruments.length === 0) {
    return { success: false, error: await tErr("oneInstrumentRequired") };
  }
  if (new Set(instruments.map((i) => i.instrument)).size !== instruments.length) {
    return { success: false, error: await tErr("instrumentOnce") };
  }
  if (instruments.some((i) => !INSTRUMENT_VALUES.includes(i.instrument))) {
    return { success: false, error: await tErr("unknownInstrument") };
  }
  if (instruments.some((i) => !SKILL_LEVEL_VALUES.includes(i.level))) {
    return { success: false, error: await tErr("levelPerInstrument") };
  }
  if (instruments.filter((i) => i.is_primary).length !== 1) {
    return { success: false, error: await tErr("primaryRequired") };
  }

  // Plan Free : 2 instruments. Qui en avait deja plus (avant la limite, ou
  // apres un retour au Free) les garde, mais n'en ajoute pas.
  const limit = await getMyInstrumentLimit();
  if (limit !== null && instruments.length > limit) {
    const current = await getMyInstruments();
    if (instruments.length > Math.max(limit, current.length)) {
      return {
        success: false,
        error: await tErr("instrumentLimit", { limit }),
      };
    }
  }

  const payload = instruments.map((i) => ({
    instrument: i.instrument,
    level: i.level,
    is_primary: i.is_primary,
    custom_label: i.instrument === "other" ? i.custom_label?.trim().slice(0, 40) || null : null,
  }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_instruments", { p_instruments: payload });

  if (error) {
    console.error("Error setting instruments:", error);
    return { success: false, error: await tErr("oops") };
  }

  // L'instrument s'affiche dans le profil et conditionne le layout principal.
  revalidatePath("/", "layout");
  return { success: true };
}
