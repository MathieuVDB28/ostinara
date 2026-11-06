"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createSong, updateSong } from "./songs";
import type {
  Instrument,
  SetlistMemberCell,
  SetlistMemberReadiness,
  SongStatus,
} from "@/types";

interface ReadinessRow {
  item_id: string;
  user_id: string;
  in_library: boolean;
  status: SongStatus | null;
  progress_percent: number | null;
  my_song_id: string | null;
  my_deezer_id: string | null;
}

async function fetchRows(setlistId: string): Promise<ReadinessRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_setlist_member_readiness", {
    p_setlist_id: setlistId,
  });
  if (error) {
    console.error("Error fetching setlist member readiness:", error);
    return null;
  }
  return (data ?? []) as ReadinessRow[];
}

/** Ou en est chaque musicien du groupe sur les morceaux d'une setlist. */
export async function getSetlistMemberReadiness(
  setlistId: string
): Promise<SetlistMemberReadiness | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: setlist } = await supabase
    .from("setlists")
    .select("band_id")
    .eq("id", setlistId)
    .maybeSingle();
  if (!setlist?.band_id) return null;

  const [{ data: items }, { data: members }, rows] = await Promise.all([
    supabase
      .from("setlist_items")
      .select("id, song_title, song_artist")
      .eq("setlist_id", setlistId)
      .eq("item_type", "song")
      .order("position", { ascending: true }),
    supabase
      .from("band_members")
      .select("user_id, instrument, instrument_label, profile:profiles(username, display_name)")
      .eq("band_id", setlist.band_id),
    fetchRows(setlistId),
  ]);
  if (!items || !members || !rows) return null;

  const cells = new Map<string, Record<string, SetlistMemberCell>>();
  for (const row of rows) {
    const byMember = cells.get(row.item_id) ?? {};
    byMember[row.user_id] = {
      in_library: row.in_library,
      status: row.status,
      progress_percent: row.progress_percent,
    };
    cells.set(row.item_id, byMember);
  }

  const sortedMembers = members
    .map((member) => {
      const profile = member.profile as unknown as { username: string; display_name: string | null } | null;
      return {
        user_id: member.user_id as string,
        name: profile?.display_name || profile?.username || "",
        instrument: member.instrument as Instrument | null,
        instrument_label: member.instrument_label as string | null,
      };
    })
    // Sa propre colonne d'abord : c'est la seule qu'on peut changer.
    .sort((a, b) => Number(b.user_id === user.id) - Number(a.user_id === user.id) || a.name.localeCompare(b.name));

  const tableRows = items.map((item) => ({
    item_id: item.id as string,
    title: (item.song_title as string | null) ?? "",
    artist: item.song_artist as string | null,
    cells: cells.get(item.id as string) ?? {},
  }));

  return {
    setlist_id: setlistId,
    current_user_id: user.id,
    members: sortedMembers,
    rows: tableRows,
    total: tableRows.length,
    ready: tableRows.filter((row) =>
      sortedMembers.every((member) => row.cells[member.user_id]?.status === "mastered")
    ).length,
  };
}

/**
 * Change son statut sur un morceau de la setlist, pour le poste tenu dans le
 * groupe. Si le morceau n'est pas dans sa biblio, il y entre (limite du plan
 * comprise, c'est createSong qui l'applique).
 */
export async function setMySetlistSongStatus(
  setlistId: string,
  itemId: string,
  status: SongStatus
): Promise<{ success: boolean; error?: string; readiness?: SetlistMemberReadiness }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  // La fonction ne renvoie rien a qui n'est pas membre du groupe.
  const rows = await fetchRows(setlistId);
  if (!rows) return { success: false, error: await tErr("updateFailed") };
  const mine = rows.find((row) => row.item_id === itemId && row.user_id === user.id);
  if (!mine) return { success: false, error: await tErr("notBandMember") };

  const { data: setlist } = await supabase
    .from("setlists")
    .select("band_id")
    .eq("id", setlistId)
    .single();
  const { data: member } = await supabase
    .from("band_members")
    .select("instrument")
    .eq("band_id", setlist?.band_id ?? "")
    .eq("user_id", user.id)
    .maybeSingle();
  const instrument = (member?.instrument as Instrument | null) ?? (await getMyPrimaryInstrument());

  let songId = mine.my_song_id;
  if (!songId) {
    const { data: item } = await supabase
      .from("setlist_items")
      .select("song_title, song_artist, song_cover_url")
      .eq("id", itemId)
      .eq("setlist_id", setlistId)
      .maybeSingle();
    if (!item?.song_title) return { success: false, error: await tErr("updateFailed") };

    const created = await createSong({
      title: item.song_title,
      artist: item.song_artist ?? "",
      cover_url: item.song_cover_url ?? undefined,
      deezer_id: mine.my_deezer_id ?? undefined,
    });
    if (!created.success || !created.song) {
      return { success: false, error: created.error ?? (await tErr("updateFailed")) };
    }
    songId = created.song.id;
  }

  // Maitrise vaut 100 % (updateSong s'en charge) ; revenir en arriere repart de zero.
  const leavesMastered = status !== "mastered" && mine.progress_percent === 100;
  const updated = await updateSong(songId, {
    instrument,
    status,
    ...(leavesMastered ? { progress_percent: 0 } : {}),
  });
  if (!updated.success) return { success: false, error: updated.error };

  revalidatePath(`/setlists/${setlistId}`);
  revalidatePath("/biblio");

  const readiness = await getSetlistMemberReadiness(setlistId);
  return { success: true, readiness: readiness ?? undefined };
}
