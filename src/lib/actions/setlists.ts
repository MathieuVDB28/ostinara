"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type {
  Setlist,
  SetlistWithDetails,
  SetlistItem,
  SetlistItemWithSongOwner,
  CreateSetlistInput,
  UpdateSetlistInput,
  CreateSetlistItemInput,
  UpdateSetlistItemInput,
  Band,
} from "@/types";

// === Get all setlists (personal + band) ===
export async function getSetlists(): Promise<SetlistWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get user's band IDs
  const { data: memberships } = await supabase
    .from("band_members")
    .select("band_id")
    .eq("user_id", user.id);

  const bandIds = memberships?.map((m) => m.band_id) || [];

  // Build query for setlists
  let query = supabase
    .from("setlists")
    .select(
      `
      *,
      band:bands(id, name, cover_url),
      items:setlist_items(*)
    `
    )
    .order("created_at", { ascending: false });

  // Filter for personal setlists or band setlists
  if (bandIds.length > 0) {
    query = query.or(`user_id.eq.${user.id},band_id.in.(${bandIds.join(",")})`);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching setlists:", error);
    return [];
  }

  // Calculate totals
  return data.map((setlist) => {
    const items = (setlist.items as SetlistItem[]).sort(
      (a, b) => a.position - b.position
    );
    return {
      ...setlist,
      band: setlist.band as Band | undefined,
      items,
      total_duration_seconds: items.reduce(
        (acc, item) =>
          acc + (item.duration_seconds || 0) + (item.transition_seconds || 0),
        0
      ),
      song_count: items.filter((item) => item.item_type === "song").length,
    };
  }) as SetlistWithDetails[];
}

// === Get a single setlist with all details ===
export async function getSetlist(
  setlistId: string
): Promise<SetlistWithDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      band:bands(id, name, cover_url),
      items:setlist_items(
        *,
        song_owner:profiles!setlist_items_song_owner_id_fkey(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("id", setlistId)
    .single();

  if (error) {
    console.error("Error fetching setlist:", error);
    return null;
  }

  const items = (data.items as SetlistItemWithSongOwner[]).sort(
    (a, b) => a.position - b.position
  );

  return {
    ...data,
    band: data.band as Band | undefined,
    items,
    total_duration_seconds: items.reduce(
      (acc, item) =>
        acc + (item.duration_seconds || 0) + (item.transition_seconds || 0),
      0
    ),
    song_count: items.filter((item) => item.item_type === "song").length,
  } as SetlistWithDetails;
}

// === Create a setlist ===
export async function createSetlist(
  input: CreateSetlistInput
): Promise<{ success: boolean; error?: string; setlist?: Setlist }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // If band_id is provided, check membership
  if (input.band_id) {
    const { data: membership } = await supabase
      .from("band_members")
      .select("id")
      .eq("band_id", input.band_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "Tu n'es pas membre de ce groupe" };
    }
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({
      ...input,
      user_id: user.id,
      is_personal: !input.band_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating setlist:", error);
    return { success: false, error: "Erreur lors de la creation" };
  }

  // Create activity
  await createActivity({
    type: "setlist_created",
    reference_id: data.id,
    metadata: { name: data.name, is_band: !!input.band_id },
  });

  revalidatePath("/setlists");
  return { success: true, setlist: data as Setlist };
}

// === Update a setlist ===
export async function updateSetlist(
  setlistId: string,
  input: UpdateSetlistInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("setlists")
    .update(input)
    .eq("id", setlistId);

  if (error) {
    console.error("Error updating setlist:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  revalidatePath("/setlists");
  revalidatePath(`/setlists/${setlistId}`);
  return { success: true };
}

// === Delete a setlist ===
export async function deleteSetlist(
  setlistId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("setlists")
    .delete()
    .eq("id", setlistId);

  if (error) {
    console.error("Error deleting setlist:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Add item to setlist ===
export async function addSetlistItem(
  input: CreateSetlistItemInput
): Promise<{ success: boolean; error?: string; item?: SetlistItem }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Get current max position
  const { data: existingItems } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("setlist_id", input.setlist_id)
    .order("position", { ascending: false })
    .limit(1);

  const maxPosition = existingItems?.[0]?.position || 0;
  const newPosition = input.position ?? maxPosition + 1;

  // Shift existing items if inserting in the middle
  if (existingItems && existingItems.length > 0 && newPosition <= maxPosition) {
    await supabase.rpc("shift_setlist_items", {
      p_setlist_id: input.setlist_id,
      p_from_position: newPosition,
      p_shift_amount: 1,
    });
  }

  const { data, error } = await supabase
    .from("setlist_items")
    .insert({
      ...input,
      position: newPosition,
      transition_seconds: input.transition_seconds || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding item:", error);
    return { success: false, error: "Erreur lors de l'ajout" };
  }

  revalidatePath(`/setlists/${input.setlist_id}`);
  return { success: true, item: data as SetlistItem };
}

// === Update setlist item ===
export async function updateSetlistItem(
  itemId: string,
  input: UpdateSetlistItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { data: item } = await supabase
    .from("setlist_items")
    .select("setlist_id")
    .eq("id", itemId)
    .single();

  const { error } = await supabase
    .from("setlist_items")
    .update(input)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating item:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  if (item) {
    revalidatePath(`/setlists/${item.setlist_id}`);
  }
  return { success: true };
}

// === Delete setlist item ===
export async function deleteSetlistItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Get item info before deletion
  const { data: item } = await supabase
    .from("setlist_items")
    .select("setlist_id, position")
    .eq("id", itemId)
    .single();

  const { error } = await supabase
    .from("setlist_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting item:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  // Reorder remaining items
  if (item) {
    await supabase.rpc("reorder_setlist_items", {
      p_setlist_id: item.setlist_id,
    });
    revalidatePath(`/setlists/${item.setlist_id}`);
  }

  return { success: true };
}

// === Reorder setlist items (for drag & drop) ===
export async function reorderSetlistItems(
  setlistId: string,
  itemId: string,
  newPosition: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Get current position
  const { data: item } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { success: false, error: "Item non trouve" };
  }

  const oldPosition = item.position;

  if (oldPosition === newPosition) {
    return { success: true };
  }

  // Use a database function for atomic reordering
  const { error } = await supabase.rpc("move_setlist_item", {
    p_setlist_id: setlistId,
    p_item_id: itemId,
    p_old_position: oldPosition,
    p_new_position: newPosition,
  });

  if (error) {
    console.error("Error reordering items:", error);
    return { success: false, error: "Erreur lors du reordonnancement" };
  }

  revalidatePath(`/setlists/${setlistId}`);
  return { success: true };
}

// === Duplicate a setlist ===
export async function duplicateSetlist(
  setlistId: string,
  newName?: string
): Promise<{ success: boolean; error?: string; setlist?: Setlist }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Get original setlist with items
  const original = await getSetlist(setlistId);
  if (!original) {
    return { success: false, error: "Setlist non trouvee" };
  }

  // Create new setlist
  const { data: newSetlist, error: setlistError } = await supabase
    .from("setlists")
    .insert({
      name: newName || `${original.name} (copie)`,
      description: original.description,
      concert_date: null, // Don't copy the date
      venue: original.venue,
      band_id: original.band_id,
      user_id: user.id,
      is_personal: original.is_personal,
    })
    .select()
    .single();

  if (setlistError) {
    console.error("Error duplicating setlist:", setlistError);
    return { success: false, error: "Erreur lors de la duplication" };
  }

  // Copy all items
  const itemsToCopy = original.items.map((item) => ({
    setlist_id: newSetlist.id,
    position: item.position,
    item_type: item.item_type,
    song_id: item.song_id,
    song_title: item.song_title,
    song_artist: item.song_artist,
    song_cover_url: item.song_cover_url,
    song_owner_id: item.song_owner_id,
    section_name: item.section_name,
    notes: item.notes,
    transition_seconds: item.transition_seconds,
    duration_seconds: item.duration_seconds,
  }));

  if (itemsToCopy.length > 0) {
    const { error: itemsError } = await supabase
      .from("setlist_items")
      .insert(itemsToCopy);

    if (itemsError) {
      console.error("Error copying items:", itemsError);
      // Rollback
      await supabase.from("setlists").delete().eq("id", newSetlist.id);
      return { success: false, error: "Erreur lors de la copie des morceaux" };
    }
  }

  revalidatePath("/setlists");
  return { success: true, setlist: newSetlist as Setlist };
}
