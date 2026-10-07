"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type {
  GearItem,
  CreateGearItemInput,
  UpdateGearItemInput,
  GearSetupWithItems,
  CreateGearSetupInput,
  UpdateGearSetupInput,
  GearWishlistItem,
  CreateGearWishlistItemInput,
  SetFavoriteGearInput,
  CoverGear,
} from "@/types";

const FREE_PLAN_GEAR_LIMIT = 5;
const FREE_PLAN_SETUP_LIMIT = 1;
const FREE_PLAN_GEAR_WISHLIST_LIMIT = 10;

// =============================================
// Gear Items CRUD
// =============================================

export async function getGearItems(): Promise<GearItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("gear_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gear items:", error);
    return [];
  }

  return data as GearItem[];
}

export async function getGearItem(id: string): Promise<GearItem | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("gear_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching gear item:", error);
    return null;
  }

  return data as GearItem;
}

export async function createGearItem(input: CreateGearItemInput): Promise<{
  success: boolean;
  error?: string;
  gearItem?: GearItem;
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier la limite pour les utilisateurs free (5 gear items max)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("gear_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= FREE_PLAN_GEAR_LIMIT) {
      return {
        success: false,
        error: `Tu as atteint la limite de ${FREE_PLAN_GEAR_LIMIT} equipements. Passe en Pro pour en ajouter plus !`,
      };
    }
  }

  const { data, error } = await supabase
    .from("gear_items")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating gear item:", error);
    return { success: false, error: "Erreur lors de l'ajout de l'equipement" };
  }

  // Creer une activite pour le feed — sauf pour le matos prive, que les
  // amis ne peuvent pas voir : ni carte dans le feed, ni notification.
  if (data.visibility !== "private") {
    await createActivity({
      type: "gear_added",
      reference_id: data.id,
      metadata: {
        brand: data.brand,
        model: data.model,
        type: data.type,
        image_url: data.image_url,
      },
    });
  }

  revalidatePath("/gear");
  revalidatePath("/feed");
  return { success: true, gearItem: data as GearItem };
}

export async function updateGearItem(
  id: string,
  input: UpdateGearItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("gear_items")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating gear item:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  revalidatePath("/gear");
  return { success: true };
}

export async function deleteGearItem(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("gear_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting gear item:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/gear");
  return { success: true };
}

export async function getGearItemsCount(): Promise<number> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("gear_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error counting gear items:", error);
    return 0;
  }

  return count || 0;
}

// =============================================
// Gear Setups CRUD
// =============================================

export async function getGearSetups(): Promise<GearSetupWithItems[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("gear_setups")
    .select(`
      *,
      gear_setup_items(*, gear:gear_items(*))
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gear setups:", error);
    return [];
  }

  // Mapper les items pour convertir la relation en format attendu
  return (data || []).map((setup: any) => ({
    ...setup,
    items: (setup.gear_setup_items || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => ({
        ...item,
        gear: Array.isArray(item.gear) ? item.gear[0] : item.gear,
      })),
    gear_setup_items: undefined,
  })) as GearSetupWithItems[];
}

export async function createGearSetup(input: CreateGearSetupInput): Promise<{
  success: boolean;
  error?: string;
  setup?: GearSetupWithItems;
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier la limite pour les utilisateurs free (1 setup max)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("gear_setups")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= FREE_PLAN_SETUP_LIMIT) {
      return {
        success: false,
        error: `Tu as atteint la limite de ${FREE_PLAN_SETUP_LIMIT} setup. Passe en Pro pour en creer plus !`,
      };
    }
  }

  const { data, error } = await supabase
    .from("gear_setups")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating gear setup:", error);
    return { success: false, error: "Erreur lors de la creation du setup" };
  }

  revalidatePath("/gear");
  return { success: true, setup: { ...data, items: [] } as GearSetupWithItems };
}

export async function updateGearSetup(
  id: string,
  input: UpdateGearSetupInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("gear_setups")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating gear setup:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  revalidatePath("/gear");
  return { success: true };
}

export async function deleteGearSetup(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("gear_setups")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting gear setup:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/gear");
  return { success: true };
}

export async function addGearToSetup(
  setupId: string,
  gearId: string,
  role?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le setup appartient a l'utilisateur
  const { data: setup } = await supabase
    .from("gear_setups")
    .select("id")
    .eq("id", setupId)
    .eq("user_id", user.id)
    .single();

  if (!setup) {
    return { success: false, error: "Setup non trouve" };
  }

  // Verifier que le gear item appartient a l'utilisateur
  const { data: gear } = await supabase
    .from("gear_items")
    .select("id")
    .eq("id", gearId)
    .eq("user_id", user.id)
    .single();

  if (!gear) {
    return { success: false, error: "Equipement non trouve" };
  }

  // Determiner la prochaine position
  const { count } = await supabase
    .from("gear_setup_items")
    .select("*", { count: "exact", head: true })
    .eq("setup_id", setupId);

  const { error } = await supabase
    .from("gear_setup_items")
    .insert({
      setup_id: setupId,
      gear_id: gearId,
      position: (count || 0) + 1,
      role: role || null,
    });

  if (error) {
    console.error("Error adding gear to setup:", error);
    if (error.code === "23505") {
      return { success: false, error: "Cet equipement est deja dans ce setup" };
    }
    return { success: false, error: "Erreur lors de l'ajout au setup" };
  }

  revalidatePath("/gear");
  return { success: true };
}

export async function removeGearFromSetup(
  setupId: string,
  gearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le setup appartient a l'utilisateur
  const { data: setup } = await supabase
    .from("gear_setups")
    .select("id")
    .eq("id", setupId)
    .eq("user_id", user.id)
    .single();

  if (!setup) {
    return { success: false, error: "Setup non trouve" };
  }

  const { error } = await supabase
    .from("gear_setup_items")
    .delete()
    .eq("setup_id", setupId)
    .eq("gear_id", gearId);

  if (error) {
    console.error("Error removing gear from setup:", error);
    return { success: false, error: "Erreur lors du retrait du setup" };
  }

  revalidatePath("/gear");
  return { success: true };
}

// =============================================
// Gear Wishlist CRUD
// =============================================

export async function getGearWishlist(): Promise<GearWishlistItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("gear_wishlist")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gear wishlist:", error);
    return [];
  }

  return data as GearWishlistItem[];
}

export async function addToGearWishlist(input: CreateGearWishlistItemInput): Promise<{
  success: boolean;
  error?: string;
  item?: GearWishlistItem;
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier la limite pour les utilisateurs free (10 items max)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("gear_wishlist")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= FREE_PLAN_GEAR_WISHLIST_LIMIT) {
      return {
        success: false,
        error: `Tu as atteint la limite de ${FREE_PLAN_GEAR_WISHLIST_LIMIT} equipements dans ta wishlist. Passe en Pro pour en ajouter plus !`,
      };
    }
  }

  const { data, error } = await supabase
    .from("gear_wishlist")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding to gear wishlist:", error);
    return { success: false, error: "Erreur lors de l'ajout a la wishlist" };
  }

  revalidatePath("/gear");
  return { success: true, item: data as GearWishlistItem };
}

export async function removeFromGearWishlist(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("gear_wishlist")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing from gear wishlist:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/gear");
  return { success: true };
}

// =============================================
// Gear Favorites (profile)
// =============================================

export async function setFavoriteGear(input: SetFavoriteGearInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le gear item appartient a l'utilisateur
  const { data: gear } = await supabase
    .from("gear_items")
    .select("id")
    .eq("id", input.gear_id)
    .eq("user_id", user.id)
    .single();

  if (!gear) {
    return { success: false, error: "Equipement non trouve" };
  }

  // Upsert : remplace si position existante, sinon insere
  const { error } = await supabase
    .from("favorite_gear")
    .upsert({
      user_id: user.id,
      gear_id: input.gear_id,
      position: input.position,
    }, {
      onConflict: "user_id,position",
    });

  if (error) {
    console.error("Error setting favorite gear:", error);
    return { success: false, error: "Erreur lors de l'ajout aux favoris" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/gear");
  return { success: true };
}

export async function removeFavoriteGear(position: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("favorite_gear")
    .delete()
    .eq("user_id", user.id)
    .eq("position", position);

  if (error) {
    console.error("Error removing favorite gear:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/gear");
  return { success: true };
}

// =============================================
// Cover Gear Tags
// =============================================

export async function getCoverGear(coverId: string): Promise<CoverGear[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("cover_gear")
    .select(`
      *,
      gear:gear_items(*)
    `)
    .eq("cover_id", coverId);

  if (error) {
    console.error("Error fetching cover gear:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    gear: Array.isArray(item.gear) ? item.gear[0] : item.gear,
  })) as CoverGear[];
}

export async function addGearToCover(
  coverId: string,
  gearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que l'utilisateur a un plan Pro/Band
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    return { success: false, error: "Fonctionnalite reservee aux plans Pro et Band" };
  }

  // Verifier que le cover appartient a l'utilisateur
  const { data: cover } = await supabase
    .from("covers")
    .select("id")
    .eq("id", coverId)
    .eq("user_id", user.id)
    .single();

  if (!cover) {
    return { success: false, error: "Cover non trouve" };
  }

  // Verifier que le gear item appartient a l'utilisateur
  const { data: gear } = await supabase
    .from("gear_items")
    .select("id")
    .eq("id", gearId)
    .eq("user_id", user.id)
    .single();

  if (!gear) {
    return { success: false, error: "Equipement non trouve" };
  }

  const { error } = await supabase
    .from("cover_gear")
    .insert({
      cover_id: coverId,
      gear_id: gearId,
    });

  if (error) {
    console.error("Error adding gear to cover:", error);
    if (error.code === "23505") {
      return { success: false, error: "Cet equipement est deja tague sur ce cover" };
    }
    return { success: false, error: "Erreur lors de l'ajout" };
  }

  revalidatePath("/covers");
  revalidatePath("/gear");
  return { success: true };
}

export async function removeGearFromCover(
  coverId: string,
  gearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le cover appartient a l'utilisateur
  const { data: cover } = await supabase
    .from("covers")
    .select("id")
    .eq("id", coverId)
    .eq("user_id", user.id)
    .single();

  if (!cover) {
    return { success: false, error: "Cover non trouve" };
  }

  const { error } = await supabase
    .from("cover_gear")
    .delete()
    .eq("cover_id", coverId)
    .eq("gear_id", gearId);

  if (error) {
    console.error("Error removing gear from cover:", error);
    return { success: false, error: "Erreur lors du retrait" };
  }

  revalidatePath("/covers");
  revalidatePath("/gear");
  return { success: true };
}

// =============================================
// Song Gear
// =============================================

export async function getSongGear(songId: string): Promise<GearItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("song_gear")
    .select(`
      *,
      gear:gear_items(*)
    `)
    .eq("song_id", songId);

  if (error) {
    console.error("Error fetching song gear:", error);
    return [];
  }

  return (data || [])
    .map((item: any) => Array.isArray(item.gear) ? item.gear[0] : item.gear)
    .filter(Boolean) as GearItem[];
}

export async function addGearToSong(
  songId: string,
  gearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le morceau appartient a l'utilisateur
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return { success: false, error: "Morceau non trouve" };
  }

  // Verifier que le gear item appartient a l'utilisateur
  const { data: gear } = await supabase
    .from("gear_items")
    .select("id")
    .eq("id", gearId)
    .eq("user_id", user.id)
    .single();

  if (!gear) {
    return { success: false, error: "Equipement non trouve" };
  }

  const { error } = await supabase
    .from("song_gear")
    .insert({
      song_id: songId,
      gear_id: gearId,
    });

  if (error) {
    console.error("Error adding gear to song:", error);
    if (error.code === "23505") {
      return { success: false, error: "Cet equipement est deja associe a ce morceau" };
    }
    return { success: false, error: "Erreur lors de l'ajout" };
  }

  revalidatePath("/library");
  revalidatePath("/gear");
  return { success: true };
}

export async function removeGearFromSong(
  songId: string,
  gearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Verifier que le morceau appartient a l'utilisateur
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return { success: false, error: "Morceau non trouve" };
  }

  const { error } = await supabase
    .from("song_gear")
    .delete()
    .eq("song_id", songId)
    .eq("gear_id", gearId);

  if (error) {
    console.error("Error removing gear from song:", error);
    return { success: false, error: "Erreur lors du retrait" };
  }

  revalidatePath("/library");
  revalidatePath("/gear");
  return { success: true };
}

// =============================================
// Public profile data
// =============================================

export async function getUserGearItems(userId: string): Promise<GearItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  // Si c'est le proprietaire, retourner tout
  if (user?.id === userId) {
    return getGearItems();
  }

  // Determiner le niveau de visibilite
  let visibilityFilter = ["public"];

  if (user) {
    // Verifier si l'utilisateur est ami
    const { data: friendship } = await supabase
      .from("friendships")
      .select("status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship?.status === "accepted") {
      visibilityFilter = ["public", "friends"];
    }
  }

  const { data, error } = await supabase
    .from("gear_items")
    .select("*")
    .eq("user_id", userId)
    .in("visibility", visibilityFilter)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user gear items:", error);
    return [];
  }

  return data as GearItem[];
}
