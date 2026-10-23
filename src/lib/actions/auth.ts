"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { applyProfileLocale } from "@/lib/actions/locale";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const t = await getTranslations("auth.errors");
  const locale = await getLocale();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const isPrivate = formData.get("is_private") === "true";

  // Vérifier que le username n'existe pas déjà
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .single();

  if (existingUser) {
    return { error: t("usernameTaken") };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username,
        is_private: isPrivate,
        // Lu par le modele d'email de confirmation Supabase
        // ({{ if eq .Data.locale "en" }}…) et recopie sur le profil.
        locale,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: t("emailTaken") };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const t = await getTranslations("auth.errors");
    if (error.message.includes("Invalid login credentials")) {
      return { error: t("invalidCredentials") };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: t("emailNotConfirmed") };
    }
    return { error: error.message };
  }

  // La langue choisie sur un autre appareil suit le compte.
  await applyProfileLocale(data.user.id);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
