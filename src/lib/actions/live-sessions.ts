"use server";

import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { announceLiveSession } from "@/lib/notifications/live-sessions";
import {
  LIVE_MESSAGE_MAX_LENGTH,
  isLiveSessionOver,
  type LiveSession,
  type LiveSessionHost,
  type LiveSessionMessage,
} from "@/lib/live-session";
import type { Instrument, UserPlan } from "@/types";

/**
 * Les sessions en direct, cote serveur. Le chrono reste celui du navigateur
 * (PracticeSessionProvider) : ici, on recopie ce que les amis peuvent en voir.
 *
 * L'annonce attend une minute dans `after()`, comme le resume des setlists :
 * le musicien qui pose son telephone et se met a jouer previent quand meme
 * ses amis, ce qu'un minuteur cote navigateur ne garantirait pas.
 */

/** Une session annulee avant ce delai ne previent personne. */
const ANNOUNCE_DELAY_MS = 60_000;
/** Un titre vient du navigateur et finit dans une notification. */
const MAX_LABEL_LENGTH = 120;

function admin() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface LiveSessionState {
  status: "running" | "paused";
  elapsedMs: number;
  songId: string | null;
  exerciseName: string | null;
  bpm: number | null;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Ce que la session montre du morceau, lu dans la bibliotheque du musicien
 * (RLS) : un titre ou une pochette envoyes par le navigateur iraient tels
 * quels chez ses amis.
 */
async function songFields(supabase: ServerClient, songId: string | null) {
  if (!songId) return { song_title: null, song_artist: null, song_cover_url: null };
  const { data } = await supabase
    .from("songs")
    .select("title, artist, cover_url")
    .eq("id", songId)
    .maybeSingle();
  return {
    song_title: data?.title ?? null,
    song_artist: data?.artist ?? null,
    song_cover_url: data?.cover_url ?? null,
  };
}

function stateFields(state: LiveSessionState) {
  const now = new Date().toISOString();
  return {
    status: state.status === "paused" ? "paused" : "running",
    accumulated_ms: Math.max(0, Math.round(state.elapsedMs)),
    segment_started_at: now,
    exercise_name: state.songId ? null : state.exerciseName?.slice(0, MAX_LABEL_LENGTH) ?? null,
    bpm: state.bpm,
    updated_at: now,
  };
}

/** L'instrument, seulement quand il n'y a pas de doute : on n'en joue qu'un. */
async function soleInstrument(supabase: ServerClient, userId: string): Promise<Instrument | null> {
  const { data } = await supabase
    .from("profile_instruments")
    .select("instrument")
    .eq("user_id", userId);
  return data?.length === 1 ? (data[0].instrument as Instrument) : null;
}

/**
 * Lance le direct, sauf pour qui ne partage pas ses sessions. Rend de quoi
 * afficher le chat au musicien : il suit son plan, pas celui de ses amis.
 */
export async function startLiveSession(
  state: LiveSessionState
): Promise<{ id: string; canChat: boolean } | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const [{ data: settings }, { data: profile }, instrument, song] = await Promise.all([
    supabase.from("profile_private").select("share_sessions").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    soleInstrument(supabase, user.id),
    songFields(supabase, state.songId),
  ]);
  if (settings?.share_sessions === false) return null;

  const db = admin();

  // Un chrono relance sans avoir ete arrete : ceux qui regardaient l'ancien
  // apprennent qu'il est fini, puis sa ligne laisse la place.
  await db
    .from("live_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("ended_at", null);
  await db.from("live_sessions").delete().eq("user_id", user.id);

  const { data, error } = await db
    .from("live_sessions")
    .insert({ user_id: user.id, instrument, ...song, ...stateFields(state) })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Error starting live session:", error);
    return null;
  }

  const id = data.id as string;
  after(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, ANNOUNCE_DELAY_MS));
      await announceLiveSession(id);
    } catch (announceError) {
      console.error("Error announcing live session:", announceError);
    }
  });

  return { id, canChat: ((profile?.plan as UserPlan | undefined) ?? "free") !== "free" };
}

/** Morceau change, pause, tempo : ce qu'en voient les amis abonnes. */
export async function updateLiveSession(id: string, state: LiveSessionState): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return;

  const song = await songFields(supabase, state.songId);
  const { error } = await admin()
    .from("live_sessions")
    .update({ ...song, ...stateFields(state) })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("ended_at", null);
  if (error) console.error("Error updating live session:", error);
}

/** Fin de session, enregistree ou annulee : le chat disparait avec elle. */
export async function endLiveSession(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const db = admin();
  const { data } = await db
    .from("live_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (data) await db.from("live_session_messages").delete().eq("session_id", id);
}

export type LiveSessionView =
  | {
      kind: "live";
      viewer: LiveSessionHost;
      session: LiveSession;
      host: LiveSessionHost;
      messages: LiveSessionMessage[];
    }
  /** Free : qui joue, sur quoi, depuis quand. Rien qui bouge, rien de plus. */
  | {
      kind: "snapshot";
      host: LiveSessionHost;
      instrument: Instrument | null;
      startedAt: string;
    }
  | { kind: "ended"; host: LiveSessionHost };

const HOST_COLUMNS = "id, username, display_name, avatar_url";

/** La page d'une session. null si on n'a pas a la voir : pas ami, ou lien errone. */
export async function getLiveSessionView(id: string): Promise<LiveSessionView | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: row } = await supabase.from("live_sessions").select("*").eq("id", id).maybeSingle();

  if (row) {
    const session = row as LiveSession;
    const { data: people } = await supabase
      .from("profiles")
      .select(HOST_COLUMNS)
      .in("id", [session.user_id, user.id]);
    const host = people?.find((person) => person.id === session.user_id);
    const viewer = people?.find((person) => person.id === user.id);
    if (!host || !viewer) return null;
    if (isLiveSessionOver(session)) return { kind: "ended", host };
    return { kind: "live", viewer, session, host, messages: await getLiveMessages(id) };
  }

  // Rien sous RLS : ami en plan Free, ou personne a qui montrer quoi que ce
  // soit. Le service role lit l'instantane une fois l'amitie verifiee.
  const db = admin();
  const { data: hidden } = await db
    .from("live_sessions")
    .select("user_id, instrument, started_at, ended_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!hidden) return null;

  const hostId = hidden.user_id as string;
  const { count } = await db
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${hostId}),and(requester_id.eq.${hostId},addressee_id.eq.${user.id})`
    );
  if (!count) return null;

  const { data: host } = await db.from("profiles").select(HOST_COLUMNS).eq("id", hostId).maybeSingle();
  if (!host) return null;

  if (isLiveSessionOver(hidden as Pick<LiveSession, "ended_at" | "updated_at">)) {
    return { kind: "ended", host };
  }
  return {
    kind: "snapshot",
    host,
    instrument: hidden.instrument as Instrument | null,
    startedAt: hidden.started_at as string,
  };
}

/** Le fil, lu sous RLS : vide pour qui n'a pas de plan payant. */
export async function getLiveMessages(sessionId: string): Promise<LiveSessionMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_session_messages")
    .select(`*, profile:profiles(${HOST_COLUMNS})`)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("Error loading live messages:", error);
    return [];
  }
  return (data ?? []) as unknown as LiveSessionMessage[];
}

export async function sendLiveMessage(
  sessionId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = content.trim();
  if (!text || text.length > LIVE_MESSAGE_MAX_LENGTH) {
    return { success: false, error: await tErr("liveMessageInvalid") };
  }

  // La RLS decide : plan payant, ami du musicien, session pas terminee.
  const { error } = await supabase
    .from("live_session_messages")
    .insert({ session_id: sessionId, user_id: user.id, content: text });
  if (error) {
    console.error("Error sending live message:", error);
    return { success: false, error: await tErr("liveMessageFailed") };
  }
  return { success: true };
}
