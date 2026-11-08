"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { rehearsalSongKey } from "@/lib/rehearsal-log";
import {
  BAND_SONG_MEMBER_NOTE_MAX,
  BAND_SONG_NOTES_MAX,
  BAND_SONG_URL_MAX,
  bandSongHref,
  isHttpUrl,
  sanitizeStructure,
} from "@/lib/band-songs";
import type {
  BandSong,
  BandSongDetails,
  BandSongInput,
  BandSongListItem,
  BandSongMember,
  Instrument,
  RehearsalVerdict,
  SongStatus,
} from "@/types";

const LIST_COLUMNS = "id, title, artist, cover_url, deezer_id, key_note, key_mode, bpm, updated_at";

function revalidateRepertoire(bandId: string, bandSongId?: string) {
  revalidatePath(`/commu/groupes/${bandId}`);
  revalidatePath(`/commu/groupes/${bandId}/repertoire`);
  if (bandSongId) revalidatePath(bandSongHref(bandId, bandSongId));
}

/** Le repertoire d'un groupe, par titre. Sous RLS : vide pour qui n'en est pas. */
export async function getBandSongs(bandId: string): Promise<BandSongListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_songs")
    .select(LIST_COLUMNS)
    .eq("band_id", bandId)
    .order("title");

  if (error) console.error("Error fetching band songs:", error);
  return (data ?? []) as BandSongListItem[];
}

/** Une fiche, avec la note et l'etat de chaque musicien, et le dernier verdict de repete. */
export async function getBandSong(bandId: string, bandSongId: string): Promise<BandSongDetails | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: song } = await supabase
    .from("band_songs")
    .select("*")
    .eq("id", bandSongId)
    .eq("band_id", bandId)
    .maybeSingle();
  if (!song) return null;

  const [{ data: members }, { data: notes }, { data: readiness }, { data: played }, { data: lines }, { data: author }] =
    await Promise.all([
      supabase
        .from("band_members")
        .select("user_id, instrument, instrument_label, joined_at, profile:profiles(id, username, display_name, avatar_url)")
        .eq("band_id", bandId)
        .order("joined_at"),
      supabase.from("band_song_notes").select("user_id, content, updated_at").eq("band_song_id", bandSongId),
      supabase.rpc("get_band_song_readiness", { p_band_song_id: bandSongId }),
      supabase
        .from("rehearsal_songs")
        .select("song_key, setlist_item_id, verdict, rehearsal:rehearsals!inner(band_id, date, logged_at)")
        .eq("rehearsal.band_id", bandId)
        .not("rehearsal.logged_at", "is", null)
        .not("verdict", "is", null),
      supabase.from("setlist_items").select("id, setlist:setlists(id, name)").eq("band_song_id", bandSongId),
      song.updated_by
        ? supabase.from("profiles").select("id, username, display_name").eq("id", song.updated_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const noteByUser = new Map((notes ?? []).map((note) => [note.user_id, note]));
  const stateByUser = new Map(
    ((readiness ?? []) as { user_id: string; in_library: boolean; status: SongStatus | null; progress_percent: number | null }[]).map(
      (row) => [row.user_id, row]
    )
  );

  const memberRows: BandSongMember[] = (members ?? []).map((member) => {
    const note = noteByUser.get(member.user_id);
    const state = stateByUser.get(member.user_id);
    return {
      user_id: member.user_id,
      profile: member.profile as unknown as BandSongMember["profile"],
      instrument: member.instrument as Instrument | null,
      instrument_label: member.instrument_label,
      note: note?.content ?? null,
      note_updated_at: note?.updated_at ?? null,
      in_library: state?.in_library ?? false,
      status: state?.in_library ? state.status : null,
      progress_percent: state?.in_library ? state.progress_percent : null,
    };
  });

  // Le dernier verdict : par la ligne de setlist reliee, sinon par le titre.
  const lineIds = new Set((lines ?? []).map((line) => line.id));
  const keys = new Set([song.song_key, rehearsalSongKey(song.title, song.artist)]);
  const lastVerdict =
    (played ?? [])
      .filter((row) => (row.setlist_item_id && lineIds.has(row.setlist_item_id)) || keys.has(row.song_key))
      .map((row) => ({
        verdict: row.verdict as RehearsalVerdict,
        date: (row.rehearsal as unknown as { date: string }).date,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  const setlists = new Map<string, { id: string; name: string }>();
  for (const line of lines ?? []) {
    const setlist = line.setlist as unknown as { id: string; name: string } | null;
    if (setlist) setlists.set(setlist.id, setlist);
  }

  return {
    song: { ...song, structure: song.structure ?? [] } as BandSong,
    updatedBy: (author as BandSongDetails["updatedBy"]) ?? null,
    members: memberRows,
    lastVerdict,
    setlists: [...setlists.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Ajouter un morceau a la main (catalogue ou saisie). Deja la : on renvoie sa fiche. */
export async function createBandSong(
  bandId: string,
  input: { title: string; artist?: string | null; cover_url?: string | null; deezer_id?: string | null }
): Promise<{ success: boolean; error?: string; bandSongId?: string; alreadyThere?: boolean }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const title = input.title.trim().slice(0, 300);
  const artist = input.artist?.trim().slice(0, 300) || null;
  if (!title) return { success: false, error: await tErr("bandSongTitleRequired") };

  const { data: band } = await supabase
    .from("band_members")
    .select("band:bands(id)")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!band) return { success: false, error: await tErr("notBandMember") };

  const songKey = rehearsalSongKey(title, artist);
  const { data, error } = await supabase
    .from("band_songs")
    .insert({
      band_id: bandId,
      // Recalculee par la base (song_match_key) : la valeur ici ne fait que remplir la colonne.
      song_key: songKey,
      title,
      artist,
      cover_url: input.cover_url || null,
      deezer_id: input.deezer_id || null,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("band_songs")
      .select("id, title, artist")
      .eq("band_id", bandId);
    const found = (existing ?? []).find((row) => rehearsalSongKey(row.title, row.artist) === songKey);
    if (found) return { success: true, bandSongId: found.id, alreadyThere: true };
    return { success: false, error: await tErr("bandSongExists") };
  }
  if (error || !data) {
    console.error("Error creating band song:", error);
    // Sous RLS : un groupe en lecture seule refuse l'ecriture.
    return { success: false, error: await tErr(error?.code === "42501" ? "bandReadOnly" : "createFailed") };
  }

  revalidateRepertoire(bandId, data.id);
  return { success: true, bandSongId: data.id };
}

function cleanText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Valide la saisie ; renvoie la cle d'erreur, ou les colonnes a ecrire. */
function bandSongPatch(input: BandSongInput): { error: string } | { patch: Record<string, unknown> } {
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = input.title.trim().slice(0, 300);
    if (!title) return { error: "bandSongTitleRequired" };
    patch.title = title;
  }
  if (input.artist !== undefined) patch.artist = cleanText(input.artist, 300);

  if (input.key_note !== undefined) {
    if (input.key_note !== null && !(Number.isInteger(input.key_note) && input.key_note >= 0 && input.key_note <= 11)) {
      return { error: "bandSongInvalid" };
    }
    patch.key_note = input.key_note;
  }
  if (input.key_mode !== undefined) {
    if (input.key_mode !== null && input.key_mode !== "major" && input.key_mode !== "minor") {
      return { error: "bandSongInvalid" };
    }
    patch.key_mode = input.key_mode;
  }
  if (input.bpm !== undefined) {
    if (input.bpm !== null && !(Number.isInteger(input.bpm) && input.bpm >= 20 && input.bpm <= 300)) {
      return { error: "bandSongInvalid" };
    }
    patch.bpm = input.bpm;
  }
  if (input.capo !== undefined) {
    if (input.capo !== null && !(Number.isInteger(input.capo) && input.capo >= 0 && input.capo <= 12)) {
      return { error: "bandSongInvalid" };
    }
    patch.capo = input.capo || null;
  }
  if (input.tuning !== undefined) patch.tuning = cleanText(input.tuning, 60);
  if (input.notes !== undefined) patch.notes = cleanText(input.notes, BAND_SONG_NOTES_MAX);

  for (const field of ["tabs_url", "reference_url"] as const) {
    if (input[field] === undefined) continue;
    const url = cleanText(input[field], BAND_SONG_URL_MAX);
    if (url && !isHttpUrl(url)) return { error: "bandSongInvalidUrl" };
    patch[field] = url;
  }

  if (input.structure !== undefined) {
    const structure = sanitizeStructure(input.structure);
    if (!structure) return { error: "bandSongInvalid" };
    patch.structure = structure;
  }

  return { patch };
}

/**
 * Modifier une fiche. `expectedUpdatedAt` : la version lue a l'ouverture ; si
 * un autre membre a enregistre depuis, rien n'est ecrit.
 */
export async function updateBandSong(
  bandSongId: string,
  input: BandSongInput,
  expectedUpdatedAt: string
): Promise<{ success: boolean; error?: string; conflict?: boolean }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const checked = bandSongPatch(input);
  if ("error" in checked) return { success: false, error: await tErr(checked.error as "bandSongInvalid") };

  const { data, error } = await supabase
    .from("band_songs")
    .update(checked.patch)
    .eq("id", bandSongId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id, band_id")
    .maybeSingle();

  if (error?.code === "23505") return { success: false, error: await tErr("bandSongExists") };
  if (error) {
    console.error("Error updating band song:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  if (!data) {
    // Rien ne correspond : la fiche a change, a disparu, ou le groupe est en lecture seule.
    const { data: current } = await supabase
      .from("band_songs")
      .select("band_id, updated_at, updated_by")
      .eq("id", bandSongId)
      .maybeSingle();
    if (!current) return { success: false, error: await tErr("bandSongNotFound") };
    if (current.updated_at === expectedUpdatedAt) return { success: false, error: await tErr("bandReadOnly") };

    const { data: author } = current.updated_by
      ? await supabase.from("profiles").select("username, display_name").eq("id", current.updated_by).maybeSingle()
      : { data: null };
    const name = author?.display_name || author?.username;
    return {
      success: false,
      conflict: true,
      error: name ? await tErr("bandSongConflict", { name }) : await tErr("bandSongConflictAnonymous"),
    };
  }

  revalidateRepertoire(data.band_id, data.id);
  return { success: true };
}

/** Retirer un morceau du repertoire : les lignes de setlist restent, sans fiche. */
export async function deleteBandSong(bandSongId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data, error } = await supabase
    .from("band_songs")
    .delete()
    .eq("id", bandSongId)
    .select("band_id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error deleting band song:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  revalidateRepertoire(data.band_id);
  return { success: true };
}

/** Ma note sur mon poste. Vide : elle est retiree. */
export async function saveMyBandSongNote(
  bandSongId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = content.trim().slice(0, BAND_SONG_MEMBER_NOTE_MAX);
  const { error } = text
    ? await supabase
        .from("band_song_notes")
        .upsert({ band_song_id: bandSongId, user_id: user.id, content: text }, { onConflict: "band_song_id,user_id" })
    : await supabase.from("band_song_notes").delete().eq("band_song_id", bandSongId).eq("user_id", user.id);

  if (error) {
    console.error("Error saving band song note:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  const { data: song } = await supabase.from("band_songs").select("band_id").eq("id", bandSongId).maybeSingle();
  if (song) revalidateRepertoire(song.band_id, bandSongId);
  return { success: true };
}
