"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type { WishlistSong, CreateWishlistSongInput } from "@/types";

export async function getWishlistSongs(): Promise<WishlistSong[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  // Vérifier si déjà dans la wishlist (par deezer_id)
  if (input.deezer_id) {
    const { data: existing } = await supabase
      .from("wishlist_songs")
      .select("id")
      .eq("user_id", user.id)
      .eq("deezer_id", input.deezer_id)
      .single();

    if (existing) {
      return { success: false, error: await tErr("songAlreadyInWishlist") };
    }
  }

  // Vérifier si déjà dans la bibliothèque (par deezer_id)
  if (input.deezer_id) {
    const { data: existingInLibrary } = await supabase
      .from("songs")
      .select("id")
      .eq("user_id", user.id)
      .eq("deezer_id", input.deezer_id)
      .single();

    if (existingInLibrary) {
      return { success: false, error: await tErr("songAlreadyInLibrary") };
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
        error: await tErr("wishlistSongLimit")
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
    return { success: false, error: await tErr("wishlistAddFailed") };
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
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("wishlist_songs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing from wishlist:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  revalidatePath("/library");
  return { success: true };
}

export async function getWishlistCount(): Promise<number> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
