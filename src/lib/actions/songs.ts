"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import { updateChallengeProgress } from "./challenges";
import type {
  CreateSongInput,
  Instrument,
  UpdateSongInput,
  Song,
  SongOrigin,
  SongStatus,
  SongsterrTabStructure,
} from "@/types";
import { syncBadges } from "@/lib/badges/sync";
import { findSongTempo } from "@/lib/services/tempo";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";

/** Les parties d'un morceau, a joindre a une requete sur songs. */
const SONG_PARTS_SELECT = "parts:song_parts(instrument, status, progress_percent)";

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("songs")
    .select(`*, covers(count), ${SONG_PARTS_SELECT}`)
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
    .select(`*, ${SONG_PARTS_SELECT}`)
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
    return { success: false, error: await tErr("notAuthenticated") };
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
        error: await tErr("songLimit")
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
    return { success: false, error: await tErr("songAddFailed") };
  }

  // Créer une activité pour le feed
  await createActivity({
    type: "song_added",
    reference_id: data.id,
    metadata: { title: data.title, artist: data.artist, cover_url: data.cover_url },
  });

  revalidatePath("/library");
  revalidatePath("/feed");
  // Un morceau, une session, un album… peuvent debloquer un badge.
  await syncBadges();

  /*
   * Le tempo cible se trouve tout seul (Songsterr, puis Deezer), apres la
   * reponse : chercher la tab prend une seconde ou deux, et un album ajoute
   * d'un coup en enchaine dix. `target_bpm is null` : on n'ecrase pas un
   * tempo regle entre-temps.
   */
  if (!data.target_bpm) {
    after(async () => {
      const bpm = await findSongTempo(data);
      if (!bpm) return;
      const { error: tempoError } = await supabase
        .from("songs")
        .update({ target_bpm: bpm })
        .eq("id", data.id)
        .is("target_bpm", null);
      if (tempoError) console.error("Error saving found tempo:", tempoError);
      else revalidatePath("/biblio");
    });
  }

  return { success: true, song: data as Song };
}

/** Ce qu'il faut pour ranger un morceau venu d'ailleurs dans la biblio. */
export interface LibrarySongSource {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  deezer_id?: string;
}

/**
 * Le point d'entree des ponts vers la bibliotheque : un titre d'album, le
 * morceau qu'un ami vient de maitriser, celui d'un defi accepte…
 *
 * Un morceau deja present — meme identifiant Deezer, ou meme titre et
 * artiste — n'est pas ajoute deux fois : on renvoie celui qui existe, pour
 * que l'appelant puisse mener a sa fiche. `status` ne s'applique qu'a un
 * nouveau morceau : on ne fait pas reculer un morceau deja maitrise.
 */
export async function addSongToLibrary(
  input: LibrarySongSource,
  status: SongStatus = "want_to_learn",
  origin?: { from: SongOrigin; label: string }
): Promise<{ success: boolean; error?: string; song?: Song; alreadyThere?: boolean }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const sameTitle = `and(title.ilike.${escapeFilter(input.title)},artist.ilike.${escapeFilter(input.artist)})`;
  const { data: existing } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", user.id)
    .or(input.deezer_id ? `deezer_id.eq.${input.deezer_id},${sameTitle}` : sameTitle)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, song: existing[0] as Song, alreadyThere: true };
  }

  const created = await createSong({
    ...input,
    status,
    added_from: origin?.from,
    added_from_label: origin?.label,
  });

  /*
   * Ce qui vient de donner envie entre dans le plan de la semaine : un
   * morceau repere sur un album ou chez un ami devient « Attaquer X ».
   * Un morceau de defi n'en a pas besoin — le defi est deja l'objectif.
   */
  if (created.success && created.song && status === "want_to_learn" && origin && origin.from !== "challenge") {
    const { suggestSongThisWeek } = await import("./weekly-plan");
    await suggestSongThisWeek(created.song).catch((error) =>
      console.error("Error adding song to weekly plan:", error)
    );
  }

  return created;
}

/**
 * Plusieurs morceaux d'un coup — les titres preferes d'un album.
 *
 * Un par un, dans l'ordre : la limite du plan gratuit arrete la serie la
 * ou elle tombe, et l'on sait exactement ce qui est passe.
 */
export async function addSongsToLibrary(
  inputs: LibrarySongSource[],
  origin?: { from: SongOrigin; label: string }
): Promise<{ success: boolean; added: number; alreadyThere: number; error?: string }> {
  let added = 0;
  let alreadyThere = 0;

  for (const input of inputs) {
    const result = await addSongToLibrary(input, "want_to_learn", origin);
    if (!result.success) {
      return { success: added + alreadyThere > 0, added, alreadyThere, error: result.error };
    }
    if (result.alreadyThere) alreadyThere += 1;
    else added += 1;
  }

  revalidatePath("/biblio");
  return { success: true, added, alreadyThere };
}

/** Une valeur entre guillemets dans un filtre PostgREST `or()`. */
function escapeFilter(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * L'activite de progression d'un changement de statut, s'il en merite une.
 * « À apprendre » -> « en cours » : song_learning. Tout passage a
 * « maîtrisé » : song_mastered (un saut direct ne poste pas l'etape « en
 * cours »). Revenir en arriere ne poste rien.
 */
function progressActivityType(
  previous: SongStatus | null,
  next: SongStatus | undefined
): "song_learning" | "song_mastered" | null {
  if (!previous || !next || previous === next) return null;
  if (next === "mastered") return "song_mastered";
  if (previous === "want_to_learn" && next === "learning") return "song_learning";
  return null;
}

export async function updateSong(
  id: string,
  input: UpdateSongInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  /*
   * Statut et progression appartiennent a une partie du morceau (un
   * instrument) : ils s'ecrivent dans song_parts, et la base en tire la
   * synthese sur songs. Le reste (titre, tempo, tab…) va sur songs.
   */
  const { instrument: requestedInstrument, status, progress_percent, ...songChanges } = input;
  const touchesPart = status !== undefined || progress_percent !== undefined;
  const instrument: Instrument | null = touchesPart
    ? requestedInstrument ?? (await getMyPrimaryInstrument())
    : null;

  // Le statut avant la mise a jour : c'est la transition qui fait l'activite
  let previousStatus: SongStatus | null = null;
  if (instrument) {
    const { data: currentPart } = await supabase
      .from("song_parts")
      .select("status")
      .eq("song_id", id)
      .eq("instrument", instrument)
      .maybeSingle();

    // Pas encore de partie sur cet instrument : on part de « à apprendre ».
    previousStatus = (currentPart?.status as SongStatus | undefined) ?? "want_to_learn";
  }

  // Un changement de statut seul ne touche pas songs : on relit le morceau
  // (et on verifie au passage qu'il est bien a nous).
  const songQuery = Object.keys(songChanges).length > 0
    ? supabase.from("songs").update(songChanges)
    : supabase.from("songs").select();
  const { data: updatedSong, error } = await songQuery
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating song:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  if (instrument) {
    // Maitrise, c'est 100 % — quel que soit l'ecran qui le decide.
    const part: { status?: SongStatus; progress_percent?: number } = {};
    if (status !== undefined) part.status = status;
    if (progress_percent !== undefined) part.progress_percent = progress_percent;
    if (status === "mastered" && progress_percent === undefined) part.progress_percent = 100;

    const { error: partError } = await supabase
      .from("song_parts")
      .upsert(
        { song_id: id, user_id: user.id, instrument, ...part },
        { onConflict: "song_id,instrument" }
      );

    if (partError) {
      console.error("Error updating song part:", partError);
      return { success: false, error: await tErr("updateFailed") };
    }
  }

  const progressType = progressActivityType(previousStatus, status);
  if (progressType && updatedSong && instrument) {
    // Une seule activite par morceau, par instrument et par etape :
    // repasser un morceau en « à apprendre » puis de nouveau en « en
    // cours » ne renotifie pas, mais le maitriser a la basse apres la
    // guitare, si. Les activites d'avant les instruments n'en portent pas :
    // elles valent pour l'instrument principal.
    const { data: posted } = await supabase
      .from("activities")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("type", progressType)
      .eq("reference_id", id);

    const primary = await getMyPrimaryInstrument();
    const alreadyPosted = (posted ?? []).some(
      (activity) => ((activity.metadata as { instrument?: Instrument } | null)?.instrument ?? primary) === instrument
    );

    if (!alreadyPosted) {
      await createActivity({
        type: progressType,
        reference_id: id,
        metadata: {
          title: updatedSong.title,
          artist: updatedSong.artist,
          cover_url: updatedSong.cover_url,
          instrument,
        },
      });
    }

    // Vérifier les challenges de maîtrise de morceau
    if (progressType === "song_mastered") {
      updateChallengeProgress(undefined, id).catch(console.error);
    }

    // Un morceau maitrise peut debloquer un badge.
    await syncBadges();
    revalidatePath("/feed");
  }

  revalidatePath("/library");
  return { success: true };
}

export async function deleteSong(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting song:", error);
    return { success: false, error: await tErr("deleteFailed") };
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
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { data: song } = await supabase
    .from("songs")
    .select("target_bpm")
    .eq("id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!song) {
    return { success: false, error: await tErr("songNotFound") };
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
    return { success: false, error: await tErr("tabSaveFailed") };
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
    return { success: false, error: await tErr("tempoRange") };
  }

  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("songs")
    .update({ target_bpm: targetBpm })
    .eq("id", songId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating target BPM:", error);
    return { success: false, error: await tErr("tempoUpdateFailed") };
  }

  // Changer la cible change la lecture de la progression : on la reecrit,
  // pour chaque instrument travaille sur ce morceau.
  const { syncSongProgressFromTempo } = await import("./practice");
  const { data: parts } = await supabase.from("song_parts").select("instrument").eq("song_id", songId);
  await Promise.all(
    (parts ?? []).map((part) => syncSongProgressFromTempo(songId, part.instrument as Instrument))
  );

  revalidatePath("/biblio");
  revalidatePath("/jouer");
  return { success: true };
}
