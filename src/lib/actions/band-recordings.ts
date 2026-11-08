"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  BAND_RECORDING_COMMENT_MAX,
  BAND_RECORDING_KINDS,
  BAND_RECORDING_MAX_FILE_BYTES,
  BAND_RECORDING_NOTE_MAX,
  BAND_RECORDING_QUOTA_BYTES,
  BAND_RECORDING_TITLE_MAX,
  bandRecordingHref,
  bandRecordingsHref,
  formatRecordingTime,
  recordingMediaType,
} from "@/lib/band-recordings";
import { bandSongHref } from "@/lib/band-songs";
import {
  removeBandRecordingFiles,
  signBandRecordingMedia,
} from "@/lib/storage/band-recording-media";
import { sendPushNotificationToMultipleUsers, type PushT } from "@/lib/notifications/send-push";
import type {
  BandRecordingComment,
  BandRecordingDetails,
  BandRecordingInput,
  BandRecordingKind,
  BandRecordingListItem,
} from "@/types";

const AUTHOR = "author:profiles!band_recordings_user_id_fkey(id, username, display_name, avatar_url)";
const LIST_SELECT = `*, ${AUTHOR}, band_song:band_songs(id, title, artist), rehearsal:rehearsals(id, title, date), comments:band_recording_comments(count)`;

type ListRow = Omit<BandRecordingListItem, "comment_count"> & { comments: { count: number }[] | null };

function toListItem(row: ListRow): BandRecordingListItem {
  const { comments, ...rest } = row;
  return {
    ...rest,
    duration_seconds: rest.duration_seconds === null ? null : Number(rest.duration_seconds),
    file_size_bytes: rest.file_size_bytes === null ? null : Number(rest.file_size_bytes),
    comment_count: comments?.[0]?.count ?? 0,
  };
}

function revalidateRecordings(bandId: string, recording?: { id: string; band_song_id?: string | null; rehearsal_id?: string | null }) {
  revalidatePath(`/commu/groupes/${bandId}`);
  revalidatePath(bandRecordingsHref(bandId));
  if (recording) {
    revalidatePath(bandRecordingHref(bandId, recording.id));
    if (recording.band_song_id) revalidatePath(bandSongHref(bandId, recording.band_song_id));
    if (recording.rehearsal_id) revalidatePath(`/setlists/rehearsals/${recording.rehearsal_id}`);
  }
}

/** Les enregistrements d'un groupe, du plus recent au plus ancien. Sous RLS : vide hors du groupe. */
export async function getBandRecordings(
  bandId: string,
  filter: { bandSongId?: string; rehearsalId?: string } = {}
): Promise<BandRecordingListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("band_recordings")
    .select(LIST_SELECT)
    .eq("band_id", bandId)
    .order("created_at", { ascending: false });
  if (filter.bandSongId) query = query.eq("band_song_id", filter.bandSongId);
  if (filter.rehearsalId) query = query.eq("rehearsal_id", filter.rehearsalId);

  const { data, error } = await query;
  if (error) console.error("Error fetching band recordings:", error);
  return ((data ?? []) as unknown as ListRow[]).map(toListItem);
}

/** Ce qu'occupent les fichiers du groupe (null hors du groupe). */
export async function getBandRecordingStorage(bandId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_band_recording_storage", { p_band_id: bandId });
  if (error) console.error("Error reading band recording storage:", error);
  return data === null || data === undefined ? null : Number(data);
}

/** Avant d'envoyer : le fichier passe-t-il dans les 20 Go du groupe ? */
export async function canUploadBandRecording(
  bandId: string,
  size: number
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { allowed: false, reason: await tErr("notAuthenticated") };
  if (size > BAND_RECORDING_MAX_FILE_BYTES) return { allowed: false, reason: await tErr("bandRecordingFileTooLarge") };
  const used = await getBandRecordingStorage(bandId);
  if (used === null) return { allowed: false, reason: await tErr("notBandMember") };
  if (used >= BAND_RECORDING_QUOTA_BYTES) return { allowed: false, reason: await tErr("bandRecordingStorageFull") };
  return { allowed: true };
}

/** Un enregistrement, ses commentaires et ses liens signes. */
export async function getBandRecording(bandId: string, recordingId: string): Promise<BandRecordingDetails | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await createClient();

  const [{ data: row }, { data: comments }, { data: me }] = await Promise.all([
    supabase.from("band_recordings").select(LIST_SELECT).eq("id", recordingId).eq("band_id", bandId).maybeSingle(),
    supabase
      .from("band_recording_comments")
      .select("*, author:profiles!band_recording_comments_user_id_fkey(id, username, display_name, avatar_url)")
      .eq("recording_id", recordingId)
      .order("start_seconds", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("band_members").select("role").eq("band_id", bandId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!row) return null;

  const recording = toListItem(row as unknown as ListRow);
  const extension = recording.media_path.split(".").pop() ?? "";
  const safeTitle = recording.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "enregistrement";
  const { mediaUrl, downloadUrl } = await signBandRecordingMedia(recording.media_path, `${safeTitle}.${extension}`);

  return {
    recording,
    mediaUrl,
    downloadUrl,
    comments: ((comments ?? []) as BandRecordingComment[]).map((comment) => ({
      ...comment,
      start_seconds: comment.start_seconds === null ? null : Number(comment.start_seconds),
      end_seconds: comment.end_seconds === null ? null : Number(comment.end_seconds),
    })),
    canModerate: me?.role === "owner" || me?.role === "admin",
  };
}

function cleanText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isKind(value: string): value is BandRecordingKind {
  return (BAND_RECORDING_KINDS as readonly string[]).includes(value);
}

async function writeError(code: string | undefined): Promise<string> {
  if (code === "53100") return tErr("bandRecordingStorageFull");
  if (code === "42501") return tErr("bandReadOnly");
  return tErr("createFailed");
}

/** Qui prevenir, et comment s'appellent le groupe et l'auteur. */
async function bandAudience(bandId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: band }, { data: members }, { data: me }] = await Promise.all([
    supabase.from("bands").select("name").eq("id", bandId).maybeSingle(),
    supabase.from("band_members").select("user_id").eq("band_id", bandId),
    supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle(),
  ]);
  return {
    bandName: band?.name ?? null,
    memberIds: (members ?? []).map((member) => member.user_id as string),
    myName: me?.display_name || me?.username || null,
  };
}

/** Enregistre la ligne d'un fichier deja envoye dans le bucket. */
export async function createBandRecording(
  bandId: string,
  input: BandRecordingInput & {
    media_path: string;
    mime_type: string;
    duration_seconds: number | null;
    file_size_bytes: number;
  }
): Promise<{ success: boolean; error?: string; recordingId?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const title = cleanText(input.title, BAND_RECORDING_TITLE_MAX);
  if (!title) return { success: false, error: await tErr("bandRecordingTitleRequired") };
  const mediaType = recordingMediaType(input.mime_type);
  if (!mediaType || !isKind(input.kind)) return { success: false, error: await tErr("createFailed") };

  const duration =
    input.duration_seconds !== null && Number.isFinite(input.duration_seconds) && input.duration_seconds >= 0
      ? Math.round(input.duration_seconds * 100) / 100
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_recordings")
    .insert({
      band_id: bandId,
      user_id: user.id,
      title,
      kind: input.kind,
      note: cleanText(input.note, BAND_RECORDING_NOTE_MAX),
      band_song_id: input.band_song_id || null,
      rehearsal_id: input.rehearsal_id || null,
      media_path: input.media_path,
      media_type: mediaType,
      mime_type: input.mime_type.slice(0, 100),
      duration_seconds: duration,
      file_size_bytes: Math.max(0, Math.round(input.file_size_bytes)),
    })
    .select("id, band_song_id, rehearsal_id")
    .single();

  if (error || !data) {
    console.error("Error creating band recording:", error);
    return { success: false, error: await writeError(error?.code) };
  }

  const recordingId = data.id as string;
  // Lu ici, pendant la requete ; seul l'envoi attend la reponse.
  const { bandName, memberIds, myName } = await bandAudience(bandId, user.id);
  const others = memberIds.filter((id) => id !== user.id);
  after(async () => {
    if (others.length === 0) return;
    await sendPushNotificationToMultipleUsers(
      others.map((id) => ({
        userId: id,
        payload: (t: PushT) => ({
          title: t("bandRecording.title", { band: bandName ?? t("yourBand") }),
          body: t("bandRecording.body", { name: myName ?? t("someone"), title }),
          tag: `band-recording-${recordingId}`,
          data: { url: bandRecordingHref(bandId, recordingId) },
        }),
        notificationType: "band_recording",
      }))
    );
  });

  revalidateRecordings(bandId, { id: recordingId, band_song_id: data.band_song_id, rehearsal_id: data.rehearsal_id });
  return { success: true, recordingId };
}

/** Titre, type, note, morceau et repete : l'auteur seul, dans un groupe actif. */
export async function updateBandRecording(
  recordingId: string,
  input: BandRecordingInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const title = cleanText(input.title, BAND_RECORDING_TITLE_MAX);
  if (!title) return { success: false, error: await tErr("bandRecordingTitleRequired") };
  if (!isKind(input.kind)) return { success: false, error: await tErr("updateFailed") };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("band_recordings")
    .select("band_id, band_song_id, rehearsal_id")
    .eq("id", recordingId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("band_recordings")
    .update({
      title,
      kind: input.kind,
      note: cleanText(input.note, BAND_RECORDING_NOTE_MAX),
      band_song_id: input.band_song_id || null,
      rehearsal_id: input.rehearsal_id || null,
    })
    .eq("id", recordingId)
    .eq("user_id", user.id)
    .select("id, band_id, band_song_id, rehearsal_id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error updating band recording:", error);
    return { success: false, error: await tErr(error?.code === "42501" || !data ? "bandReadOnly" : "updateFailed") };
  }

  revalidateRecordings(data.band_id, data);
  if (before) revalidateRecordings(before.band_id, { id: recordingId, ...before });
  return { success: true };
}

/** L'auteur (meme en lecture seule), ou le titulaire et les admins d'un groupe actif. */
export async function deleteBandRecording(recordingId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_recordings")
    .delete()
    .eq("id", recordingId)
    .select("id, band_id, media_path, band_song_id, rehearsal_id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error deleting band recording:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  // La ligne est partie sous RLS : le fichier peut suivre.
  await removeBandRecordingFiles([data.media_path]);
  revalidateRecordings(data.band_id, data);
  return { success: true };
}

function cleanSeconds(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

/** Un commentaire a un moment (ou sur un passage), ou une reponse. */
export async function addRecordingComment(input: {
  recordingId: string;
  content: string;
  parentId?: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
}): Promise<{ success: boolean; error?: string; comment?: BandRecordingComment }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const content = cleanText(input.content, BAND_RECORDING_COMMENT_MAX);
  if (!content) return { success: false, error: await tErr("recordingCommentRequired") };

  const parentId = input.parentId || null;
  const start = parentId ? null : cleanSeconds(input.startSeconds);
  const rawEnd = parentId ? null : cleanSeconds(input.endSeconds);
  if (!parentId && start === null) return { success: false, error: await tErr("recordingCommentTime") };
  const end = rawEnd !== null && start !== null && rawEnd > start ? rawEnd : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_recording_comments")
    .insert({
      recording_id: input.recordingId,
      user_id: user.id,
      parent_id: parentId,
      start_seconds: start,
      end_seconds: end,
      content,
    })
    .select("*, author:profiles!band_recording_comments_user_id_fkey(id, username, display_name, avatar_url)")
    .single();

  if (error || !data) {
    console.error("Error adding recording comment:", error);
    const key = error?.code === "22003" ? "recordingCommentTime" : error?.code === "42501" ? "bandReadOnly" : "createFailed";
    return { success: false, error: await tErr(key) };
  }

  const comment = data as BandRecordingComment;
  const notifications = await commentNotifications(user.id, input.recordingId, comment, parentId);
  if (notifications.length > 0) after(() => sendPushNotificationToMultipleUsers(notifications));

  const { data: recording } = await supabase.from("band_recordings").select("band_id").eq("id", input.recordingId).maybeSingle();
  if (recording) revalidatePath(bandRecordingHref(recording.band_id, input.recordingId));
  return { success: true, comment };
}

/**
 * L'auteur de l'enregistrement apprend qu'on l'a commente ; l'auteur d'un
 * commentaire apprend qu'on lui a repondu. Qui recoit les deux n'en recoit qu'un.
 */
async function commentNotifications(
  commenterId: string,
  recordingId: string,
  comment: BandRecordingComment,
  parentId: string | null
): Promise<Parameters<typeof sendPushNotificationToMultipleUsers>[0]> {
  const supabase = await createClient();
  const [{ data: recording }, { data: parent }, { data: me }] = await Promise.all([
    supabase.from("band_recordings").select("band_id, title, user_id").eq("id", recordingId).maybeSingle(),
    parentId
      ? supabase.from("band_recording_comments").select("user_id, start_seconds").eq("id", parentId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("username, display_name").eq("id", commenterId).maybeSingle(),
  ]);
  if (!recording) return [];

  const name = me?.display_name || me?.username || null;
  const url = `${bandRecordingHref(recording.band_id, recordingId)}#comment-${parentId ?? comment.id}`;
  const preview = comment.content.length > 120 ? `${comment.content.slice(0, 117)}…` : comment.content;
  const notifications: Parameters<typeof sendPushNotificationToMultipleUsers>[0] = [];

  const replyTo = parent?.user_id as string | null | undefined;
  if (replyTo && replyTo !== commenterId) {
    notifications.push({
      userId: replyTo,
      payload: (t: PushT) => ({
        title: t("bandRecordingReply.title", { name: name ?? t("someone") }),
        body: t("bandRecordingReply.body", {
          title: recording.title,
          time: formatRecordingTime(parent?.start_seconds),
          text: preview,
        }),
        data: { url },
      }),
      notificationType: "band_recording_reply",
    });
  }

  const owner = recording.user_id as string | null;
  if (owner && owner !== commenterId && owner !== replyTo) {
    const time = formatRecordingTime(parentId ? parent?.start_seconds : comment.start_seconds);
    notifications.push({
      userId: owner,
      payload: (t: PushT) => ({
        title: t("bandRecordingComment.title", { name: name ?? t("someone"), title: recording.title }),
        body: t("bandRecordingComment.body", { time, text: preview }),
        data: { url },
      }),
      notificationType: "band_recording_comment",
    });
  }

  return notifications;
}

/** Corriger son commentaire : le texte, et le moment pour un commentaire (pas une reponse). */
export async function updateRecordingComment(
  commentId: string,
  input: { content: string; startSeconds?: number | null; endSeconds?: number | null }
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const content = cleanText(input.content, BAND_RECORDING_COMMENT_MAX);
  if (!content) return { success: false, error: await tErr("recordingCommentRequired") };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("band_recording_comments")
    .select("parent_id, recording_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!current) return { success: false, error: await tErr("updateFailed") };

  const patch: Record<string, unknown> = { content };
  if (!current.parent_id && input.startSeconds !== undefined) {
    const start = cleanSeconds(input.startSeconds);
    if (start === null) return { success: false, error: await tErr("recordingCommentTime") };
    const end = cleanSeconds(input.endSeconds);
    patch.start_seconds = start;
    patch.end_seconds = end !== null && end > start ? end : null;
  }

  const { data, error } = await supabase
    .from("band_recording_comments")
    .update(patch)
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error updating recording comment:", error);
    const key = error?.code === "22003" ? "recordingCommentTime" : !data ? "bandReadOnly" : "updateFailed";
    return { success: false, error: await tErr(key) };
  }

  const { data: recording } = await supabase.from("band_recordings").select("band_id").eq("id", current.recording_id).maybeSingle();
  if (recording) revalidatePath(bandRecordingHref(recording.band_id, current.recording_id));
  return { success: true };
}

/** Son commentaire (et ses reponses), ou n'importe lequel pour le titulaire et les admins. */
export async function deleteRecordingComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_recording_comments")
    .delete()
    .eq("id", commentId)
    .select("recording_id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error deleting recording comment:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  const { data: recording } = await supabase.from("band_recordings").select("band_id").eq("id", data.recording_id).maybeSingle();
  if (recording) revalidatePath(bandRecordingHref(recording.band_id, data.recording_id));
  return { success: true };
}

/** De quoi relier un enregistrement : le repertoire et les repetes deja passees (ou du jour). */
export async function getRecordingLinkOptions(bandId: string): Promise<{
  songs: { id: string; title: string; artist: string | null }[];
  rehearsals: { id: string; title: string | null; date: string }[];
}> {
  const supabase = await createClient();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const [{ data: songs }, { data: rehearsals }] = await Promise.all([
    supabase.from("band_songs").select("id, title, artist").eq("band_id", bandId).order("title"),
    supabase
      .from("rehearsals")
      .select("id, title, date")
      .eq("band_id", bandId)
      .neq("status", "cancelled")
      .lte("date", endOfToday.toISOString())
      .order("date", { ascending: false })
      .limit(60),
  ]);
  return { songs: songs ?? [], rehearsals: rehearsals ?? [] };
}
