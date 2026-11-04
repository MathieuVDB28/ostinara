import type { Instrument } from "@/types";

/** La ligne `live_sessions`, telle que la lisent le musicien et ses amis Pro/Band. */
export interface LiveSession {
  id: string;
  user_id: string;
  instrument: Instrument | null;
  status: "running" | "paused";
  started_at: string;
  accumulated_ms: number;
  segment_started_at: string;
  song_title: string | null;
  song_artist: string | null;
  song_cover_url: string | null;
  exercise_name: string | null;
  bpm: number | null;
  ended_at: string | null;
  updated_at: string;
}

export interface LiveSessionHost {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface LiveSessionMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: LiveSessionHost | null;
}

/**
 * Sans nouvelle du musicien depuis ce delai, sa session n'est plus en direct :
 * un chrono oublie sur un telephone ne doit pas rester « en train de jouer ».
 */
export const LIVE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const LIVE_MESSAGE_MAX_LENGTH = 500;

export function isLiveSessionOver(
  session: Pick<LiveSession, "ended_at" | "updated_at">,
  now = Date.now()
): boolean {
  return session.ended_at !== null || now - Date.parse(session.updated_at) > LIVE_SESSION_TTL_MS;
}

/** Le temps ecoule, recalcule chez celui qui regarde. */
export function liveSessionElapsedMs(
  session: Pick<LiveSession, "status" | "accumulated_ms" | "segment_started_at">,
  now = Date.now()
): number {
  if (session.status !== "running") return session.accumulated_ms;
  return session.accumulated_ms + Math.max(0, now - Date.parse(session.segment_started_at));
}

export function liveSessionHref(sessionId: string): string {
  return `/commu/direct/${sessionId}`;
}

export function formatLiveElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
