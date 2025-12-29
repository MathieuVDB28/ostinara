"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type { CreateSongInput, UpdateSongInput, Song, SongStatus } from "@/types";

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching songs:", error);
    return [];
  }

  return data as Song[];
}

export async function getSong(id: string): Promise<Song | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching song:", error);
    return null;
  }

  return data as Song;
}

export async function createSong(input: CreateSongInput): Promise<{ success: boolean; error?: string; song?: Song }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier la limite pour les utilisateurs free (10 morceaux max)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 10) {
      return {
        success: false,
        error: "Tu as atteint la limite de 10 morceaux. Passe en Pro pour en ajouter plus !"
      };
    }
  }

  const { data, error } = await supabase
    .from("songs")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating song:", error);
    return { success: false, error: "Erreur lors de l'ajout du morceau" };
  }

  // Créer une activité pour le feed
  await createActivity({
    type: "song_added",
    reference_id: data.id,
    metadata: { title: data.title, artist: data.artist, cover_url: data.cover_url },
  });

  revalidatePath("/library");
  revalidatePath("/feed");
  return { success: true, song: data as Song };
}

export async function updateSong(
  id: string,
  input: UpdateSongInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Récupérer le statut actuel si on change le statut vers mastered
  let previousStatus: SongStatus | null = null;
  if (input.status === "mastered") {
    const { data: currentSong } = await supabase
      .from("songs")
      .select("status, title, artist")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (currentSong) {
      previousStatus = currentSong.status as SongStatus;
    }
  }

  const { data: updatedSong, error } = await supabase
    .from("songs")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating song:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  // Créer une activité si le morceau vient d'être maîtrisé
  if (input.status === "mastered" && previousStatus !== "mastered" && updatedSong) {
    await createActivity({
      type: "song_mastered",
      reference_id: id,
      metadata: { title: updatedSong.title, artist: updatedSong.artist, cover_url: updatedSong.cover_url },
    });
    revalidatePath("/feed");
  }

  revalidatePath("/library");
  return { success: true };
}

export async function deleteSong(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting song:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/library");
  return { success: true };
}

export async function updateSongStatus(
  id: string,
  status: "want_to_learn" | "learning" | "mastered"
): Promise<{ success: boolean; error?: string }> {
  return updateSong(id, {
    status,
    progress_percent: status === "mastered" ? 100 : undefined,
  });
}

export async function updateSongProgress(
  id: string,
  progress_percent: number
): Promise<{ success: boolean; error?: string }> {
  const status = progress_percent === 100 ? "mastered" :
                 progress_percent > 0 ? "learning" : "want_to_learn";

  return updateSong(id, { progress_percent, status });
}
