"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { RoutineItem, RoutineWithItems } from "@/types";
import type { SaveSessionItemInput } from "./setlists";

// === Toutes les routines de l'utilisateur ===
export async function getRoutines(): Promise<RoutineWithItems[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("routines")
    .select("*, items:routine_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching routines:", error);
    return [];
  }

  return data.map((routine) => {
    const items = (routine.items as RoutineItem[]).sort(
      (a, b) => a.position - b.position
    );
    return {
      ...routine,
      items,
      song_count: items.filter((i) => i.item_type === "song").length,
      exercise_count: items.filter((i) => i.item_type === "exercise").length,
    };
  }) as RoutineWithItems[];
}

// === Creer une routine depuis une session montee dans « Jouer » ===
export async function createRoutineWithItems(
  name: string,
  items: SaveSessionItemInput[]
): Promise<{ success: boolean; error?: string; routineId?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Donne un nom à la routine" };
  }

  const { data: routine, error } = await supabase
    .from("routines")
    .insert({ name: trimmed, user_id: user.id })
    .select()
    .single();

  if (error || !routine) {
    console.error("Error creating routine:", error);
    return { success: false, error: "Erreur lors de la creation" };
  }

  if (items.length > 0) {
    const rows = items.map((item, i) => ({
      routine_id: routine.id,
      position: i + 1,
      item_type: item.item_type,
      song_id: item.song_id ?? null,
      song_title: item.song_title ?? null,
      song_artist: item.song_artist ?? null,
      song_cover_url: item.song_cover_url ?? null,
      exercise_id: item.exercise_id ?? null,
      exercise_name: item.exercise_name ?? null,
      exercise_category: item.exercise_category ?? null,
      bpm: item.bpm ?? null,
      duration_seconds: item.duration_seconds ?? null,
    }));

    const { error: itemsError } = await supabase
      .from("routine_items")
      .insert(rows);

    if (itemsError) {
      console.error("Error inserting routine items:", itemsError);
      await supabase.from("routines").delete().eq("id", routine.id);
      return { success: false, error: "Erreur lors de l'ajout des elements" };
    }
  }

  revalidatePath("/jouer");
  return { success: true, routineId: routine.id };
}

// === Supprimer une routine ===
export async function deleteRoutine(
  routineId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting routine:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/jouer");
  return { success: true };
}
