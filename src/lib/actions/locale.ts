"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/i18n/config";

async function writeLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

// === Changer de langue (Reglages, landing, pages publiques) ===
// Le cookie pour les pages, le profil pour ce qui part sans requete
// (push, rappels, emails).
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return { success: false as const };

  await writeLocaleCookie(locale);

  const user = await getAuthenticatedUser();
  if (user) {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
    if (error) console.error("Error saving locale:", error);
  }

  revalidatePath("/", "layout");
  return { success: true as const };
}

// === A la connexion : la langue du compte suit l'utilisateur ===
// Sur un nouvel appareil, le cookie vient de la detection ; si le compte a
// deja une langue, elle l'emporte.
export async function applyProfileLocale(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("locale").eq("id", userId).maybeSingle();
  if (isLocale(data?.locale)) await writeLocaleCookie(data.locale);
}
