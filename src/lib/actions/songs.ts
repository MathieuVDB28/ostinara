"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import { updateChallengeProgress } from "./challenges";
import type {
  CreateSongInput,
  UpdateSongInput,
  Song,
  SongStatus,
  SongsterrTabStructure,
} from "@/types";

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*, covers(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching songs:", error);
    return [];
  }

  return (data || []).map((song) => ({
    ...song,
    covers: undefined,
    covers_count: song.covers?.[0]?.count ?? 0,
  })) as Song[];
}

export async function getSong(id: string): Promise<Song | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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

    // Vérifier les challenges de maîtrise de morceau
    updateChallengeProgress(undefined, id).catch(console.error);

    revalidatePath("/feed");
  }

  revalidatePath("/library");
  return { success: true };
}

export async function deleteSong(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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

/**
 * Range l'analyse d'une tablature sur le morceau.
 *
 * Le pont Songsterr existait a moitie : la recherche trouvait la tab, le
 * parseur en tirait le tempo et les sections — puis tout etait jete. On
 * rouvrait le morceau et il fallait tout retelecharger, ou bien saisir le
 * tempo a la main alors que la partition le donne.
 *
 * `target_bpm` n'est ecrit que s'il est vide : le tempo de la partition
 * est une proposition, pas une decision. Qui a regle sa cible a 104 pour
 * travailler ne doit pas la voir sauter a 168 parce qu'il a lie une tab.
 */
export async function saveSongTabStructure(
  songId: string,
  input: {
    songsterrId?: number | null;
    tabsUrl?: string | null;
    structure: SongsterrTabStructure;
  }
): Promise<{ success: boolean; error?: string; targetBpmApplied?: number }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { data: song } = await supabase
    .from("songs")
    .select("target_bpm")
    .eq("id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!song) {
    return { success: false, error: "Morceau introuvable" };
  }

  const { structure } = input;
  const applyTarget = !song.target_bpm && structure.bpm > 0;

  const { error } = await supabase
    .from("songs")
    .update({
      songsterr_id: input.songsterrId ?? null,
      tabs_url: input.tabsUrl ?? undefined,
      tab_bpm: structure.bpm || null,
      tab_time_signature_beats: structure.timeSignatureBeats || null,
      tab_time_signature_value: structure.timeSignatureValue || null,
      tab_total_measures: structure.totalMeasures || null,
      tab_sections: structure.sections ?? [],
      tab_synced_at: new Date().toISOString(),
      ...(applyTarget ? { target_bpm: structure.bpm } : {}),
    })
    .eq("id", songId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error saving tab structure:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de la tablature" };
  }

  revalidatePath("/biblio");
  revalidatePath("/jouer");
  return {
    success: true,
    targetBpmApplied: applyTarget ? structure.bpm : undefined,
  };
}

/**
 * Le tempo cible d'un morceau, regle depuis n'importe quel ecran.
 *
 * C'est la valeur qui a remplace le curseur « 0-100 % » : la seule chose
 * qu'un guitariste decide vraiment a propos d'un morceau qu'il travaille.
 */
export async function setSongTargetBpm(
  songId: string,
  targetBpm: number | null
): Promise<{ success: boolean; error?: string }> {
  if (targetBpm !== null && (targetBpm < 20 || targetBpm > 300)) {
    return { success: false, error: "Le tempo doit être compris entre 20 et 300 BPM" };
  }

  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("songs")
    .update({ target_bpm: targetBpm })
    .eq("id", songId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating target BPM:", error);
    return { success: false, error: "Erreur lors de la mise à jour du tempo" };
  }

  // Changer la cible change la lecture de la progression : on la reecrit.
  const { syncSongProgressFromTempo } = await import("./practice");
  await syncSongProgressFromTempo(songId);

  revalidatePath("/biblio");
  revalidatePath("/jouer");
  return { success: true };
}
