"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { PROFILE_INSTRUMENTS_SELECT } from "@/lib/instruments";
import { sendPushNotification } from "@/lib/notifications";
import type { StaffApplication, StaffMember, StaffRole } from "@/types";

type Result = { success: boolean; error?: string };

// === Mon role dans l'equipe (null = membre ordinaire) ===
export async function getMyStaffRole(): Promise<StaffRole | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("staff_role")
    .eq("id", user.id)
    .single();
  return (data?.staff_role as StaffRole | null) ?? null;
}

// === Ma derniere demande, pour l'afficher dans Reglages ===
export async function getMyStaffApplication(): Promise<StaffApplication | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_applications")
    .select("id, user_id, motivation, links, status, reviewed_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching staff application:", error);
    return null;
  }
  return data as StaffApplication | null;
}

// === Demander a rejoindre l'equipe ===
export async function applyToStaff(input: {
  motivation: string;
  links?: string;
}): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const motivation = input.motivation.trim();
  const links = input.links?.trim().slice(0, 500) || null;
  if (motivation.length < 20 || motivation.length > 2000) {
    return { success: false, error: await tErr("staffMotivationLength") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_applications")
    .insert({ user_id: user.id, motivation, links });

  if (error) {
    // 23505 : une demande attend deja (index unique partiel)
    if (error.code === "23505") {
      return { success: false, error: await tErr("staffApplicationPending") };
    }
    console.error("Error creating staff application:", error);
    return { success: false, error: await tErr("createFailed") };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();
  const name = me?.display_name || me?.username;

  // Prevenir les admins. La liste des admins se lit avec le service role :
  // elle n'a pas a etre exposee aux membres.
  after(async () => {
    const admin = createServiceRoleClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("staff_role", "admin");

    await Promise.all(
      (admins ?? []).map((a) =>
        sendPushNotification(
          a.id,
          (t) => ({
            title: t("staffApplication.title"),
            body: t("staffApplication.body", { name: name ?? t("someone") }),
            tag: "staff-application",
            data: { url: "/admin" },
          }),
          "staff_application"
        )
      )
    );
  });

  revalidatePath("/profil/reglages");
  revalidatePath("/admin");
  return { success: true };
}

// === Retirer sa demande tant qu'elle attend ===
export async function withdrawStaffApplication(id: string): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error withdrawing staff application:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  revalidatePath("/profil/reglages");
  revalidatePath("/admin");
  return { success: true };
}

// === Admin : demandes en attente ===
export async function getPendingStaffApplications(): Promise<StaffApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_applications")
    .select(
      `id, user_id, motivation, links, status, reviewed_at, created_at,
       user:profiles!staff_applications_user_id_fkey(id, username, display_name, avatar_url, ${PROFILE_INSTRUMENTS_SELECT})`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching staff applications:", error);
    return [];
  }
  return (data ?? []) as unknown as StaffApplication[];
}

// === Admin : l'equipe actuelle ===
export async function getStaffMembers(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, staff_role")
    .not("staff_role", "is", null)
    .order("staff_role")
    .order("username");

  if (error) {
    console.error("Error fetching staff members:", error);
    return [];
  }
  return (data ?? []) as StaffMember[];
}

// === Admin : accepter / refuser une demande ===
export async function reviewStaffApplication(
  id: string,
  accept: boolean
): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: applicantId, error } = await supabase.rpc("review_staff_application", {
    p_application_id: id,
    p_accept: accept,
  });

  if (error || !applicantId) {
    console.error("Error reviewing staff application:", error);
    return { success: false, error: await tErr("staffAdminOnly") };
  }

  after(() =>
    sendPushNotification(
      applicantId as string,
      (t) => ({
        title: t(accept ? "staffAccepted.title" : "staffDeclined.title"),
        body: t(accept ? "staffAccepted.body" : "staffDeclined.body"),
        tag: "staff-application",
        data: { url: accept ? "/admin" : "/profil/reglages" },
      }),
      "staff_application_reviewed"
    )
  );

  revalidatePath("/admin");
  return { success: true };
}

// === Admin : changer le role d'un membre (null = le retirer de l'equipe) ===
export async function setStaffRole(
  userId: string,
  role: StaffRole | null
): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  if (userId === user.id && role !== "admin") {
    return { success: false, error: await tErr("staffCannotDemoteSelf") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_staff_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    console.error("Error setting staff role:", error);
    return { success: false, error: await tErr("staffAdminOnly") };
  }

  revalidatePath("/admin");
  return { success: true };
}
