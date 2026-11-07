"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getIntlLocale, tErr } from "@/i18n/server";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { isInFuture } from "@/lib/datetime-local";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers, type PushT } from "@/lib/notifications";
import { createActivity } from "./activities";
import { updateChallengeProgress } from "./challenges";
import { createPracticeSession } from "./practice";
import {
  REHEARSAL_MAX_MINUTES,
  REHEARSAL_TASK_MAX_LENGTH,
  rehearsalSongKey,
  rehearsalStats,
  setlistReadiness,
  splitRehearsalMinutes,
} from "@/lib/rehearsal-log";
import type {
  BandRehearsalJournal,
  ConfirmRehearsalInput,
  PendingRehearsalConfirmation,
  RehearsalAttendee,
  RehearsalLogDetails,
  RehearsalSong,
  RehearsalTask,
  RehearsalVerdict,
  SaveRehearsalLogInput,
  SetlistReadiness,
} from "@/types";

const ATTENDEE_SELECT = `
  *,
  profile:profiles!rehearsal_attendees_user_id_fkey(id, username, display_name, avatar_url)
`;
const TASK_SELECT = `
  *,
  assignee:profiles!rehearsal_tasks_assignee_id_fkey(id, username, display_name, avatar_url)
`;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function revalidateRehearsal(rehearsalId: string, bandId?: string) {
  revalidatePath(`/setlists/rehearsals/${rehearsalId}`);
  if (bandId) revalidatePath(`/commu/groupes/${bandId}`);
  revalidatePath("/accueil");
}

/** Le compte rendu d'une repete : qui etait la, ce qui a ete joue, ce qu'il reste a bosser. */
export async function getRehearsalLog(rehearsalId: string): Promise<RehearsalLogDetails> {
  const supabase = await createClient();
  const [{ data: attendees }, { data: songs }, { data: tasks }] = await Promise.all([
    supabase.from("rehearsal_attendees").select(ATTENDEE_SELECT).eq("rehearsal_id", rehearsalId).order("created_at"),
    supabase.from("rehearsal_songs").select("*").eq("rehearsal_id", rehearsalId).order("position"),
    supabase.from("rehearsal_tasks").select(TASK_SELECT).eq("rehearsal_id", rehearsalId).order("created_at"),
  ]);

  return {
    attendees: (attendees ?? []) as RehearsalAttendee[],
    songs: (songs ?? []) as RehearsalSong[],
    tasks: (tasks ?? []) as RehearsalTask[],
  };
}

/**
 * Cree la session du musicien, ce qui confirme sa presence (trigger). La base
 * refuse une seconde session pour la meme repete : un double appui ne compte
 * pas le temps deux fois.
 */
async function recordAttendance(
  supabase: SupabaseClient,
  userId: string,
  rehearsal: { id: string; title: string; date: string; band_name: string },
  input: ConfirmRehearsalInput
): Promise<{ success: boolean; error?: string }> {
  const attendanceStatus = async () => {
    const { data } = await supabase
      .from("rehearsal_attendees")
      .select("status")
      .eq("rehearsal_id", rehearsal.id)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.status as string | undefined;
  };

  const previous = await attendanceStatus();
  if (!previous) return { success: false, error: await tErr("rehearsalAttendanceNotFound") };
  if (previous === "confirmed") return { success: true };

  // Ce qui a ete joue, en face de ma biblio.
  const [{ data: played }, { data: library }] = await Promise.all([
    supabase.from("rehearsal_songs").select("song_key, deezer_id").eq("rehearsal_id", rehearsal.id).order("position"),
    supabase.from("songs").select("id, title, artist, deezer_id").eq("user_id", userId),
  ]);
  const byDeezer = new Map((library ?? []).filter((song) => song.deezer_id).map((song) => [song.deezer_id, song.id]));
  const byKey = new Map((library ?? []).map((song) => [rehearsalSongKey(song.title, song.artist), song.id]));
  const songIds = (played ?? []).map(
    (song) => (song.deezer_id && byDeezer.get(song.deezer_id)) || byKey.get(song.song_key) || null
  );

  const session = await createPracticeSession({
    songs: splitRehearsalMinutes(input.duration_minutes, songIds),
    instrument: input.instrument,
    duration_minutes: input.duration_minutes,
    practiced_at: rehearsal.date,
    mood: input.mood ?? undefined,
    rehearsal_id: rehearsal.id,
    // La repete a sa propre activite, plus bas : pas une session en plus.
    share: false,
  });

  if (!session.success) {
    // Un autre appui est passe entre-temps : sa session existe deja.
    if ((await attendanceStatus()) === "confirmed") return { success: true };
    return { success: false, error: session.error };
  }

  if (input.share) {
    // Les notes et les verdicts restent dans le groupe.
    await createActivity({
      type: "rehearsal_logged",
      reference_id: rehearsal.id,
      metadata: {
        band_name: rehearsal.band_name,
        duration_minutes: input.duration_minutes,
        practiced_at: rehearsal.date,
        instrument: input.instrument,
        song_count: played?.length ?? 0,
      },
    });
  }

  return { success: true };
}

function validDuration(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= REHEARSAL_MAX_MINUTES;
}

/** Enregistre un compte rendu : une repete planifiee, ou une repete jamais planifiee. */
export async function saveRehearsalLog(
  input: SaveRehearsalLogInput
): Promise<{ success: boolean; error?: string; rehearsalId?: string; conflict?: boolean }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  if (isInFuture(input.date)) return { success: false, error: await tErr("rehearsalInFuture") };
  if (!validDuration(input.duration_minutes)) {
    return { success: false, error: await tErr("rehearsalDurationInvalid") };
  }

  const { data: membership } = await supabase
    .from("band_members")
    .select("band:bands(name)")
    .eq("band_id", input.band_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { success: false, error: await tErr("notBandMember") };
  const bandName = (membership.band as unknown as { name: string } | null)?.name ?? "";

  // La date d'avant : si elle change, les sessions suivent (trigger) et mes defis
  // se recalculent ; ceux des autres, a leur prochaine session.
  const { data: before } = input.rehearsal_id
    ? await supabase.from("rehearsals").select("date").eq("id", input.rehearsal_id).maybeSingle()
    : { data: null };

  const t = await getTranslations("rehearsals.log");
  const title =
    input.title?.trim() ||
    t("defaultTitle", {
      date: new Intl.DateTimeFormat(await getIntlLocale(), {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Paris",
      }).format(new Date(input.date)),
    });

  // Le meme morceau coche deux fois n'en fait qu'un.
  const seen = new Set<string>();
  const songs = input.songs.flatMap((song) => {
    const songTitle = song.title.trim();
    if (!songTitle) return [];
    const song_key = rehearsalSongKey(songTitle, song.artist);
    if (seen.has(song_key)) return [];
    seen.add(song_key);
    return [{ ...song, title: songTitle, song_key }];
  });

  const tasks = input.tasks
    .map((task) => ({ ...task, content: task.content.trim().slice(0, REHEARSAL_TASK_MAX_LENGTH) }))
    .filter((task) => task.content);

  const { data, error } = await supabase.rpc("save_rehearsal_log", {
    p_rehearsal_id: input.rehearsal_id ?? null,
    p_band_id: input.band_id,
    p_title: title,
    p_date: input.date,
    p_duration_minutes: input.duration_minutes,
    p_location: input.location?.trim() || null,
    p_setlist_id: input.setlist_id || null,
    p_notes: input.notes?.trim() || null,
    p_attendee_ids: input.attendee_ids,
    p_songs: songs,
    p_tasks: tasks,
    p_expected_updated_at: input.expected_updated_at ?? null,
  });

  if (error || !data) {
    console.error("Error saving rehearsal log:", error);
    return { success: false, error: await tErr("rehearsalLogFailed") };
  }

  const saved = data as {
    id: string;
    conflict?: boolean;
    updated_by?: string | null;
    new_attendees: string[];
    new_tasks: { assignee_id: string; content: string }[];
  };

  // Un autre membre a enregistre depuis l'ouverture du formulaire : rien n'est ecrit.
  if (saved.conflict) {
    const { data: author } = saved.updated_by
      ? await supabase.from("profiles").select("username, display_name").eq("id", saved.updated_by).maybeSingle()
      : { data: null };
    const name = author?.display_name || author?.username;
    return {
      success: false,
      conflict: true,
      error: name ? await tErr("rehearsalLogConflict", { name }) : await tErr("rehearsalLogConflictAnonymous"),
    };
  }

  if (before && new Date(before.date).getTime() !== new Date(input.date).getTime()) {
    await updateChallengeProgress().catch(console.error);
    revalidatePath("/progress");
  }

  // Le temps du musicien qui raconte, s'il l'a demande. Le compte rendu est
  // enregistre : une erreur ici ne le perd pas, il pourra confirmer depuis la fiche.
  if (input.carnet && input.attendee_ids.includes(user.id)) {
    const carnet = await recordAttendance(
      supabase,
      user.id,
      { id: saved.id, title, date: input.date, band_name: bandName },
      { ...input.carnet, duration_minutes: input.duration_minutes }
    );
    if (!carnet.success) console.error("Error adding rehearsal to log:", carnet.error);
  }

  const { data: me } = await supabase.from("profiles").select("username, display_name").eq("id", user.id).single();
  const authorName = me?.display_name || me?.username || null;
  const url = `/setlists/rehearsals/${saved.id}`;

  const notifications = [
    ...saved.new_attendees
      .filter((id) => id !== user.id)
      .map((id) => ({
        userId: id,
        payload: (tp: PushT) => ({
          title: tp("rehearsalLogged.title", { band: bandName }),
          body: tp("rehearsalLogged.body", { name: authorName ?? tp("someone"), title }),
          data: { url },
        }),
        notificationType: "rehearsal_logged" as const,
      })),
    ...saved.new_tasks
      .filter((task) => task.assignee_id !== user.id)
      .map((task) => ({
        userId: task.assignee_id,
        payload: (tp: PushT) => ({
          title: tp("rehearsalTask.title", { band: bandName }),
          body: tp("rehearsalTask.body", { name: authorName ?? tp("someone"), content: task.content }),
          data: { url },
        }),
        notificationType: "rehearsal_task" as const,
      })),
  ];
  if (notifications.length > 0) {
    after(() => sendPushNotificationToMultipleUsers(notifications));
  }

  revalidateRehearsal(saved.id, input.band_id);
  if (input.setlist_id) revalidatePath(`/setlists/${input.setlist_id}`);
  return { success: true, rehearsalId: saved.id };
}

/** « Tu y etais ? » : oui. Le temps entre dans mon carnet, avec mes reglages. */
export async function confirmRehearsalAttendance(
  rehearsalId: string,
  input: ConfirmRehearsalInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  if (!validDuration(input.duration_minutes)) {
    return { success: false, error: await tErr("rehearsalDurationInvalid") };
  }
  if (!INSTRUMENT_VALUES.includes(input.instrument)) {
    return { success: false, error: await tErr("unknownInstrument") };
  }

  const { data: rehearsal } = await supabase
    .from("rehearsals")
    .select("id, title, date, band_id, band:bands(name)")
    .eq("id", rehearsalId)
    .maybeSingle();
  if (!rehearsal) return { success: false, error: await tErr("rehearsalNotFound") };

  const result = await recordAttendance(
    supabase,
    user.id,
    {
      id: rehearsal.id,
      title: rehearsal.title,
      date: rehearsal.date,
      band_name: (rehearsal.band as unknown as { name: string } | null)?.name ?? "",
    },
    input
  );
  if (result.success) revalidateRehearsal(rehearsalId, rehearsal.band_id);
  return result;
}

/** « Tu y etais ? » : non. Rien n'entre dans mes statistiques. */
export async function declineRehearsalAttendance(
  rehearsalId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { error } = await supabase
    .from("rehearsal_attendees")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("rehearsal_id", rehearsalId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error declining rehearsal attendance:", error);
    return { success: false, error: await tErr("rehearsalLogFailed") };
  }

  revalidateRehearsal(rehearsalId);
  return { success: true };
}

/** Oublie par celui qui a raconte : « J'y etais aussi ». Reste a confirmer. */
export async function joinRehearsalAttendance(
  rehearsalId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: rehearsal } = await supabase
    .from("rehearsals")
    .select("band_id")
    .eq("id", rehearsalId)
    .maybeSingle();
  if (!rehearsal) return { success: false, error: await tErr("rehearsalNotFound") };

  const { data: member } = await supabase
    .from("band_members")
    .select("instrument, instrument_label")
    .eq("band_id", rehearsal.band_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { success: false, error: await tErr("notBandMember") };

  const { error } = await supabase.from("rehearsal_attendees").upsert(
    {
      rehearsal_id: rehearsalId,
      user_id: user.id,
      instrument: member.instrument,
      instrument_label: member.instrument_label,
      tagged_by: user.id,
    },
    { onConflict: "rehearsal_id,user_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("Error joining rehearsal attendance:", error);
    return { success: false, error: await tErr("rehearsalLogFailed") };
  }

  revalidateRehearsal(rehearsalId, rehearsal.band_id);
  return { success: true };
}

/** Cocher ou decocher un point a bosser. */
export async function setRehearsalTaskDone(
  taskId: string,
  done: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data, error } = await supabase
    .from("rehearsal_tasks")
    .update({ done_at: done ? new Date().toISOString() : null, done_by: done ? user.id : null })
    .eq("id", taskId)
    .select("band_id, rehearsal_id")
    .maybeSingle();

  if (error || !data) {
    console.error("Error updating rehearsal task:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  revalidateRehearsal(data.rehearsal_id, data.band_id);
  return { success: true };
}

/** Les repetes ou l'on m'a tague et ou je n'ai pas encore repondu. */
export async function getPendingRehearsalConfirmations(): Promise<PendingRehearsalConfirmation[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("rehearsal_attendees")
    .select("rehearsal_id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    // Ce que je n'ai pas ajoute a mon carnet moi-meme, je l'ai choisi.
    .or(`tagged_by.is.null,tagged_by.neq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending rehearsal confirmations:", error);
    return [];
  }
  return data ?? [];
}

/** Pour le lien « Raconter une repete » de Jouer : seulement si j'ai un groupe. */
export async function hasBandMembership(): Promise<boolean> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return false;

  const { count } = await supabase
    .from("band_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return (count ?? 0) > 0;
}

/** Le journal d'un groupe : ses repetes racontees, ses chiffres, ce qu'il reste a bosser. */
export async function getBandRehearsalJournal(bandId: string): Promise<BandRehearsalJournal> {
  const supabase = await createClient();

  const [{ data: logs }, { data: unlogged }, { data: openTasks }] = await Promise.all([
    supabase
      .from("rehearsals")
      .select(`
        id, title, date, duration_minutes, location,
        songs:rehearsal_songs(song_key, song_title, song_artist),
        attendees:rehearsal_attendees(status)
      `)
      .eq("band_id", bandId)
      .not("logged_at", "is", null)
      .order("date", { ascending: false }),
    // Passees, jamais racontees : invisibles sinon, la liste ne montre que l'avenir.
    supabase
      .from("rehearsals")
      .select("id, title, date")
      .eq("band_id", bandId)
      .eq("status", "scheduled")
      .is("logged_at", null)
      .lt("date", new Date().toISOString())
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("rehearsal_tasks")
      .select(TASK_SELECT)
      .eq("band_id", bandId)
      .is("done_at", null)
      .order("created_at"),
  ]);

  const rows = (logs ?? []) as unknown as {
    id: string;
    title: string;
    date: string;
    duration_minutes: number | null;
    location: string | null;
    songs: { song_key: string; song_title: string; song_artist: string | null }[];
    attendees: { status: string }[];
  }[];

  return {
    stats: rehearsalStats(rows),
    logs: rows.map(({ songs, attendees, ...row }) => ({
      ...row,
      song_count: songs.length,
      // Ceux qui ont confirme : un tague qui n'a pas repondu n'est pas compte.
      attendee_count: attendees.filter((attendee) => attendee.status === "confirmed").length,
    })),
    unlogged: unlogged ?? [],
    openTasks: (openTasks ?? []) as RehearsalTask[],
  };
}

/** Ou en est une setlist de groupe, d'apres les verdicts rendus en repete. */
export async function getSetlistReadiness(
  bandId: string,
  items: { id: string; item_type: string; song_title?: string | null; song_artist?: string | null }[]
): Promise<SetlistReadiness> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rehearsal_songs")
    .select("setlist_item_id, song_key, verdict, rehearsal:rehearsals!inner(band_id, date, logged_at)")
    .eq("rehearsal.band_id", bandId)
    .not("rehearsal.logged_at", "is", null)
    .not("verdict", "is", null);

  if (error) console.error("Error fetching setlist readiness:", error);

  const played = (data ?? []).map((row) => ({
    setlist_item_id: row.setlist_item_id as string | null,
    song_key: row.song_key as string,
    verdict: row.verdict as RehearsalVerdict,
    date: (row.rehearsal as unknown as { date: string }).date,
  }));

  return setlistReadiness(
    items.filter((item) => item.item_type === "song"),
    played
  );
}
