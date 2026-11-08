"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { requirePaidPlan } from "@/lib/actions/plan";
import { recordingMediaType } from "@/lib/band-recordings";
import { signCoverMedia } from "@/lib/storage/cover-media";
import type { Instrument, SongTake } from "@/types";

/*
 * Fonctions Pro : objectif de tempo date (par morceau et par instrument) et
 * prises privees d'un morceau, a comparer avec ses covers.
 */

// === Objectif de tempo date ===

/** Pose ou retire l'objectif d'un instrument sur un morceau. `null` le retire. */
export async function setTempoGoal(
  songId: string,
  instrument: Instrument,
  goal: { bpm: number; date: string } | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  // Retirer reste possible apres un retour en Free ; poser est reserve au Pro.
  if (goal) {
    const plan = await requirePaidPlan();
    if (!plan.allowed) return { success: false, error: plan.error };
    if (!Number.isInteger(goal.bpm) || goal.bpm < 20 || goal.bpm > 300 || !/^\d{4}-\d{2}-\d{2}$/.test(goal.date)) {
      return { success: false, error: await tErr("tempoGoalInvalid") };
    }
  }

  const supabase = await createClient();
  const { data: song } = await supabase.from("songs").select("id").eq("id", songId).eq("user_id", user.id).maybeSingle();
  if (!song) return { success: false, error: await tErr("songNotFound") };

  const values = { goal_bpm: goal?.bpm ?? null, goal_date: goal?.date ?? null };
  const { data: updated, error } = await supabase
    .from("song_parts")
    .update(values)
    .eq("song_id", songId)
    .eq("instrument", instrument)
    .select("id");

  // Pas encore de partie pour cet instrument : on la cree avec l'objectif.
  if (!error && (!updated || updated.length === 0) && goal) {
    const { error: insertError } = await supabase
      .from("song_parts")
      .insert({ song_id: songId, user_id: user.id, instrument, ...values });
    if (insertError) {
      console.error("Error creating song part for goal:", insertError);
      return { success: false, error: await tErr("updateFailed") };
    }
  } else if (error) {
    console.error("Error setting tempo goal:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  revalidatePath("/biblio");
  return { success: true };
}

// === Prises privees ===

function serviceRole() {
  return createServiceRoleClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function toTake(row: Record<string, unknown>): SongTake {
  return {
    ...(row as unknown as SongTake),
    duration_seconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    file_size_bytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes),
  };
}

/** Les prises d'un morceau, de la plus recente a la plus ancienne, avec leurs liens signes. */
export async function getSongTakes(songId: string): Promise<SongTake[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("song_takes")
    .select("*")
    .eq("song_id", songId)
    .order("recorded_at", { ascending: false });
  if (error) console.error("Error fetching song takes:", error);
  const takes = (data ?? []).map(toTake);
  const signed = await signCoverMedia(takes.map((take) => ({ ...take, media_url: take.media_path })));
  return signed.map(({ media_url, ...take }) => ({ ...take, media_url: media_url ?? null }));
}

/** Enregistre la ligne d'une prise deja envoyee dans <moi>/takes/<morceau>/. */
export async function createSongTake(input: {
  songId: string;
  instrument: Instrument | null;
  title: string | null;
  mediaPath: string;
  mimeType: string;
  durationSeconds: number | null;
  fileSizeBytes: number;
}): Promise<{ success: boolean; error?: string; take?: SongTake }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const plan = await requirePaidPlan();
  if (!plan.allowed) return { success: false, error: plan.error };

  const mediaType = recordingMediaType(input.mimeType);
  if (!mediaType) return { success: false, error: await tErr("createFailed") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("song_takes")
    .insert({
      user_id: user.id,
      song_id: input.songId,
      instrument: input.instrument,
      title: input.title?.trim().slice(0, 120) || null,
      media_path: input.mediaPath,
      media_type: mediaType,
      mime_type: input.mimeType.slice(0, 100),
      duration_seconds:
        input.durationSeconds !== null && Number.isFinite(input.durationSeconds)
          ? Math.round(input.durationSeconds * 100) / 100
          : null,
      file_size_bytes: Math.max(0, Math.round(input.fileSizeBytes)),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error creating song take:", error);
    // Ligne refusee : le fichier envoye ne doit pas rester compter dans les 20 Go.
    await serviceRole().storage.from("covers").remove([input.mediaPath]);
    return {
      success: false,
      error: error?.code === "53100" ? await tErr("coverStorageFull", { limit: 20 }) : await tErr("createFailed"),
    };
  }

  const [take] = await getSongTakesByIds([data.id as string]);
  return { success: true, take };
}

async function getSongTakesByIds(ids: string[]): Promise<SongTake[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("song_takes").select("*").in("id", ids);
  const takes = (data ?? []).map(toTake);
  const signed = await signCoverMedia(takes.map((take) => ({ ...take, media_url: take.media_path })));
  return signed.map(({ media_url, ...take }) => ({ ...take, media_url: media_url ?? null }));
}

/** Supprimer une prise et son fichier (meme apres un retour en Free). */
export async function deleteSongTake(takeId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("song_takes")
    .delete()
    .eq("id", takeId)
    .select("media_path")
    .maybeSingle();
  if (error || !data) return { success: false, error: await tErr("deleteFailed") };
  const { error: storageError } = await serviceRole().storage.from("covers").remove([data.media_path]);
  if (storageError) console.error("Error removing take file:", storageError);
  return { success: true };
}
