"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers, type PushT } from "@/lib/notifications";
import type { CreateRehearsalPollInput, RehearsalPoll, RehearsalPollAnswer } from "@/types";

const POLL_SELECT =
  "id, band_id, created_by, title, location, setlist_id, status, created_at, options:rehearsal_poll_options!rehearsal_poll_options_poll_id_fkey(id, starts_at, ends_at, position, votes:rehearsal_poll_votes(user_id, answer))";

/** Les refus de la base, en mots. */
async function pollError(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("poll_option_count")) return tErr("pollOptionCount");
  if (message.includes("poll_option_past")) return tErr("pollOptionPast");
  if (message.includes("poll_closed")) return tErr("pollClosed");
  if (message.includes("poll_not_allowed") || error?.code === "42501") return tErr("pollNotAllowed");
  return tErr("pollSaveFailed");
}

/** Les sondages ouverts d'un groupe, creneaux dans l'ordre. */
export async function getBandPolls(bandId: string): Promise<RehearsalPoll[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rehearsal_polls")
    .select(POLL_SELECT)
    .eq("band_id", bandId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching rehearsal polls:", error);
    return [];
  }

  return ((data ?? []) as unknown as RehearsalPoll[]).map((poll) => ({
    ...poll,
    options: [...poll.options].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  }));
}

async function bandContext(bandId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: band }, { data: members }, { data: me }] = await Promise.all([
    supabase.from("bands").select("name").eq("id", bandId).single(),
    supabase.from("band_members").select("user_id").eq("band_id", bandId),
    supabase.from("profiles").select("username, display_name").eq("id", userId).single(),
  ]);
  return {
    bandName: band?.name ?? null,
    others: (members ?? []).map((member) => member.user_id as string).filter((id) => id !== userId),
    myName: me?.display_name || me?.username || null,
  };
}

export async function createRehearsalPoll(
  input: CreateRehearsalPollInput
): Promise<{ success: boolean; error?: string; pollId?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: pollId, error } = await supabase.rpc("create_rehearsal_poll", {
    p_band_id: input.band_id,
    p_title: input.title,
    p_location: input.location ?? "",
    p_setlist_id: input.setlist_id ?? null,
    p_options: input.options,
  });

  if (error || !pollId) {
    console.error("Error creating rehearsal poll:", error);
    return { success: false, error: await pollError(error) };
  }

  const { bandName, others, myName } = await bandContext(input.band_id, user.id);
  if (others.length > 0) {
    await sendPushNotificationToMultipleUsers(
      others.map((id) => ({
        userId: id,
        payload: (t: PushT) => ({
          title: t("rehearsalPoll.title", { band: bandName ?? t("yourBand") }),
          body: t("rehearsalPoll.body", {
            name: myName ?? t("someone"),
            count: input.options.length,
            title: input.title,
          }),
          data: { url: `/commu/groupes/${input.band_id}#poll-${pollId}` },
        }),
        notificationType: "rehearsal_poll",
      }))
    );
  }

  revalidatePath(`/commu/groupes/${input.band_id}`);
  return { success: true, pollId: pollId as string };
}

/** Repondre a un creneau ; `null` retire la reponse. */
export async function voteRehearsalPoll(
  optionId: string,
  answer: RehearsalPollAnswer | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { error } = answer
    ? await supabase
        .from("rehearsal_poll_votes")
        .upsert(
          { option_id: optionId, user_id: user.id, answer, updated_at: new Date().toISOString() },
          { onConflict: "option_id,user_id" }
        )
    : await supabase.from("rehearsal_poll_votes").delete().eq("option_id", optionId).eq("user_id", user.id);

  if (error) {
    console.error("Error voting on rehearsal poll:", error);
    return { success: false, error: await tErr("pollVoteFailed") };
  }
  return { success: true };
}

/** Valider un creneau : la repete est creee, les reponses deviennent les RSVP. */
export async function closeRehearsalPoll(
  pollId: string,
  optionId: string
): Promise<{ success: boolean; error?: string; rehearsalId?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: rehearsalId, error } = await supabase.rpc("close_rehearsal_poll", {
    p_poll_id: pollId,
    p_option_id: optionId,
  });

  if (error || !rehearsalId) {
    console.error("Error closing rehearsal poll:", error);
    return { success: false, error: await pollError(error) };
  }

  const { data: rehearsal } = await supabase
    .from("rehearsals")
    .select("band_id, title, date")
    .eq("id", rehearsalId)
    .single();

  if (rehearsal) {
    const { others, myName } = await bandContext(rehearsal.band_id, user.id);
    const date = new Date(rehearsal.date);
    if (others.length > 0) {
      await sendPushNotificationToMultipleUsers(
        others.map((id) => ({
          userId: id,
          payload: (t: PushT, locale: Locale) => ({
            title: t("rehearsalCreated.title"),
            body: t("rehearsalCreated.body", {
              name: myName ?? t("someone"),
              title: rehearsal.title,
              // L'heure du groupe, pas celle du serveur.
              date: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Paris",
              }).format(date),
            }),
            data: { url: `/setlists/rehearsals/${rehearsalId}` },
          }),
          notificationType: "rehearsal_created",
        }))
      );
    }
    revalidatePath(`/commu/groupes/${rehearsal.band_id}`);
  }

  revalidatePath("/setlists");
  return { success: true, rehearsalId: rehearsalId as string };
}

export async function deleteRehearsalPoll(pollId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  // Sous RLS : rien n'est efface pour qui n'en a pas le droit.
  const { data, error } = await supabase.from("rehearsal_polls").delete().eq("id", pollId).select("band_id");

  if (error) {
    console.error("Error deleting rehearsal poll:", error);
    return { success: false, error: await tErr("pollSaveFailed") };
  }
  if (!data || data.length === 0) return { success: false, error: await tErr("pollNotAllowed") };

  revalidatePath(`/commu/groupes/${data[0].band_id}`);
  return { success: true };
}
