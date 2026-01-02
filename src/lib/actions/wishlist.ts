"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type { WishlistSong, CreateWishlistSongInput } from "@/types";

export async function getWishlistSongs(): Promise<WishlistSong[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("wishlist_songs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching wishlist songs:", error);
    return [];
  }

  return data as WishlistSong[];
}

export async function addToWishlist(
  input: CreateWishlistSongInput
): Promise<{ success: boolean; error?: string; song?: WishlistSong }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier si déjà dans la wishlist (par spotify_id)
  if (input.spotify_id) {
    const { data: existing } = await supabase
      .from("wishlist_songs")
      .select("id")
      .eq("user_id", user.id)
      .eq("spotify_id", input.spotify_id)
      .single();

    if (existing) {
      return { success: false, error: "Ce morceau est déjà dans ta wishlist" };
    }
  }

  // Vérifier si déjà dans la bibliothèque (par spotify_id)
  if (input.spotify_id) {
    const { data: existingInLibrary } = await supabase
      .from("songs")
      .select("id")
      .eq("user_id", user.id)
      .eq("spotify_id", input.spotify_id)
      .single();

    if (existingInLibrary) {
      return { success: false, error: "Ce morceau est déjà dans ta bibliothèque" };
    }
  }

  // Vérifier la limite pour les utilisateurs free (20 morceaux max dans la wishlist)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("wishlist_songs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 20) {
      return {
        success: false,
        error: "Tu as atteint la limite de 20 morceaux dans ta wishlist. Passe en Pro pour en ajouter plus !"
      };
    }
  }

  const { data, error } = await supabase
    .from("wishlist_songs")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding to wishlist:", error);
    return { success: false, error: "Erreur lors de l'ajout à la wishlist" };
  }

  // Créer une activité pour le feed
  await createActivity({
    type: "song_wishlisted",
    reference_id: data.id,
    metadata: {
      title: data.title,
      artist: data.artist,
      cover_url: data.cover_url
    },
  });

  revalidatePath("/library");
  revalidatePath("/feed");
  return { success: true, song: data as WishlistSong };
}

export async function removeFromWishlist(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("wishlist_songs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing from wishlist:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/library");
  return { success: true };
}

export async function getWishlistCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("wishlist_songs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error counting wishlist:", error);
    return 0;
  }

  return count || 0;
}
