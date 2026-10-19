"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "@/lib/actions/activities";
import type { AlbumWishlistItem, CreateAlbumWishlistInput } from "@/types";

// === Récupérer la wishlist albums ===
export async function getAlbumWishlist(): Promise<AlbumWishlistItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("album_wishlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching album wishlist:", error);
    return [];
  }

  return (data || []) as AlbumWishlistItem[];
}

// === Ajouter un album à la wishlist ===
export async function addToAlbumWishlist(
  input: CreateAlbumWishlistInput
): Promise<{ success: boolean; error?: string; album?: AlbumWishlistItem }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  // Vérifier si déjà dans la wishlist (par deezer_id)
  if (input.deezer_id) {
    const { data: existing } = await supabase
      .from("album_wishlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("deezer_id", input.deezer_id)
      .single();

    if (existing) {
      return { success: false, error: await tErr("albumAlreadyInWishlist") };
    }
  }

  // Vérifier si déjà dans les reviews (par deezer_id)
  if (input.deezer_id) {
    const { data: existingReview } = await supabase
      .from("album_reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("deezer_id", input.deezer_id)
      .single();

    if (existingReview) {
      return { success: false, error: await tErr("albumAlreadyReviewed") };
    }
  }

  // Vérifier la limite pour les utilisateurs free (20 albums max)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("album_wishlist")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 20) {
      return {
        success: false,
        error: await tErr("wishlistAlbumLimit"),
      };
    }
  }

  const { data, error } = await supabase
    .from("album_wishlist")
    .insert({
      user_id: user.id,
      album_name: input.album_name,
      artist_name: input.artist_name,
      cover_url: input.cover_url || null,
      deezer_id: input.deezer_id || null,
      release_date: input.release_date || null,
      total_tracks: input.total_tracks || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding to album wishlist:", error);
    return { success: false, error: await tErr("wishlistAddFailed") };
  }

  // Créer une activité pour le feed. Attendue : non attendue, son
  // revalidatePath partait apres la fin de l'action, pendant le rendu, et
  // Next le refuse.
  await createActivity({
    type: "album_wishlisted",
    reference_id: data.id,
    metadata: {
      album_name: input.album_name,
      artist_name: input.artist_name,
      cover_url: input.cover_url,
    },
  }).catch(console.error);

  revalidatePath("/albums");
  return { success: true, album: data as AlbumWishlistItem };
}

// === Retirer un album de la wishlist ===
export async function removeFromAlbumWishlist(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("album_wishlist")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing from album wishlist:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  revalidatePath("/albums");
  return { success: true };
}
