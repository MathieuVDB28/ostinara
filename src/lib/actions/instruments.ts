"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { INSTRUMENT_VALUES, SKILL_LEVEL_VALUES } from "@/lib/instruments";
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

// === Remplacer ses instruments (onboarding et reglages) ===
export async function setMyInstruments(
  instruments: ProfileInstrument[],
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Non authentifié" };

  if (instruments.length === 0) {
    return { success: false, error: "Choisis au moins un instrument." };
  }
  if (new Set(instruments.map((i) => i.instrument)).size !== instruments.length) {
    return { success: false, error: "Chaque instrument une seule fois." };
  }
  if (instruments.some((i) => !INSTRUMENT_VALUES.includes(i.instrument))) {
    return { success: false, error: "Instrument inconnu." };
  }
  if (instruments.some((i) => !SKILL_LEVEL_VALUES.includes(i.level))) {
    return { success: false, error: "Indique ton niveau pour chaque instrument." };
  }
  if (instruments.filter((i) => i.is_primary).length !== 1) {
    return { success: false, error: "Choisis ton instrument principal." };
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
    return { success: false, error: "Oups, ça n'est pas passé. Réessaie dans un instant." };
  }

  // L'instrument s'affiche dans le profil et conditionne le layout principal.
  revalidatePath("/", "layout");
  return { success: true };
}
