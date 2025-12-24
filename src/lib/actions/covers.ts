"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type { Cover, CoverWithSong, CreateCoverInput, UpdateCoverInput } from "@/types";

const FREE_PLAN_COVER_LIMIT = 3;

export async function getCovers(): Promise<CoverWithSong[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("covers")
    .select(`
      *,
      song:songs(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching covers:", error);
    return [];
  }

  return data as CoverWithSong[];
}

export async function getCoversBySong(songId: string): Promise<Cover[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("covers")
    .select("*")
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching covers:", error);
    return [];
  }

  return data as Cover[];
}

export async function canUploadCover(): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "Non authentifié" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan !== "free") {
    return { allowed: true };
  }

  const { count } = await supabase
    .from("covers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentCount = count || 0;

  if (currentCount >= FREE_PLAN_COVER_LIMIT) {
    return {
      allowed: false,
      reason: `Tu as atteint la limite de ${FREE_PLAN_COVER_LIMIT} covers. Passe en Pro pour en ajouter plus !`,
      limit: FREE_PLAN_COVER_LIMIT,
      current: currentCount
    };
  }

  return { allowed: true, limit: FREE_PLAN_COVER_LIMIT, current: currentCount };
}

export async function createCover(input: CreateCoverInput): Promise<{
  success: boolean;
  error?: string;
  cover?: Cover
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier la limite du plan
  const uploadCheck = await canUploadCover();
  if (!uploadCheck.allowed) {
    return { success: false, error: uploadCheck.reason };
  }

  // Vérifier que le morceau appartient à l'utilisateur
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", input.song_id)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return { success: false, error: "Morceau non trouvé" };
  }

  const { data, error } = await supabase
    .from("covers")
    .insert({
      ...input,
      user_id: user.id,
      visibility: input.visibility || "friends",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating cover:", error);
    return { success: false, error: "Erreur lors de l'ajout du cover" };
  }

  // Créer une activité si le cover est visible par les amis ou public
  const visibility = input.visibility || "friends";
  if (visibility !== "private") {
    await createActivity({
      type: "cover_posted",
      reference_id: data.id,
      metadata: { visibility },
    });
    revalidatePath("/feed");
  }

  revalidatePath("/covers");
  revalidatePath("/library");
  return { success: true, cover: data as Cover };
}

export async function updateCover(
  id: string,
  input: UpdateCoverInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("covers")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating cover:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/covers");
  return { success: true };
}

export async function deleteCover(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Récupérer le cover pour supprimer les fichiers storage
  const { data: cover } = await supabase
    .from("covers")
    .select("media_url, thumbnail_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cover) {
    return { success: false, error: "Cover non trouvé" };
  }

  // Supprimer de la base de données
  const { error } = await supabase
    .from("covers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting cover:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  // Supprimer les fichiers du storage
  try {
    const mediaPath = extractStoragePath(cover.media_url);
    if (mediaPath) {
      await supabase.storage.from("covers").remove([mediaPath]);
    }
    if (cover.thumbnail_url) {
      const thumbPath = extractStoragePath(cover.thumbnail_url);
      if (thumbPath) {
        await supabase.storage.from("covers").remove([thumbPath]);
      }
    }
  } catch (e) {
    console.error("Error deleting storage files:", e);
  }

  revalidatePath("/covers");
  revalidatePath("/library");
  return { success: true };
}

function extractStoragePath(url: string): string | null {
  // Extraire le chemin depuis l'URL Supabase Storage
  const match = url.match(/\/storage\/v1\/object\/public\/covers\/(.+)$/);
  return match ? match[1] : null;
}
