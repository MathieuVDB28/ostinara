"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMetronome } from "./use-metronome";
import { useSharedClock } from "./use-shared-clock";
import { songStartFrom } from "@/lib/metronome-sync";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  JamSession,
  JamSessionWithDetails,
  JamSessionMessageWithProfile,
  JamPresenceState,
  Profile,
} from "@/types";

/** Le premier temps part apres ce delai : le temps que le message arrive partout. */
const GRID_LEAD_MS = 1000;
const GRID_REPEAT_MS = 5000;

/** Decompte avant le premier temps du morceau, en mesures, au choix de l'hote. */
export const JAM_COUNT_IN_OPTIONS = [0, 1, 2] as const;
export type JamCountIn = (typeof JAM_COUNT_IN_OPTIONS)[number];

interface UseJamSessionOptions {
  sessionId: string;
  userId: string;
  userProfile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  isHost: boolean;
  initialSession: JamSessionWithDetails;
  initialMessages: JamSessionMessageWithProfile[];
}

interface UseJamSessionReturn {
  // Session state
  session: JamSessionWithDetails;
  isConnected: boolean;
  participants: JamPresenceState[];
  messages: JamSessionMessageWithProfile[];

  // Metronome (synced)
  metronome: ReturnType<typeof useMetronome>;
  /** L'horloge commune, en ms. */
  sharedNow: () => number;
  /** Premier temps du morceau apres le decompte, sur l'horloge commune ; null a l'arret. */
  songStartAt: number | null;
  countInMeasures: JamCountIn;
  setCountInMeasures: (measures: JamCountIn) => void;

  // Actions
  syncMetronome: () => void;
  toggleMetronome: () => void;
  stopMetronome: () => void;
  changeSong: (
    index: number,
    songId: string | null,
    title: string | null,
    artist: string | null
  ) => void;
  updateSessionStatus: (status: "waiting" | "active" | "paused" | "ended") => void;

  // Chat
  sendMessage: (content: string) => Promise<void>;
}

export function useJamSession({
  sessionId,
  userId,
  userProfile,
  isHost,
  initialSession,
  initialMessages,
}: UseJamSessionOptions): UseJamSessionReturn {
  const supabase = createClient();

  const [session, setSession] = useState<JamSessionWithDetails>(initialSession);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<JamPresenceState[]>([]);
  const [messages, setMessages] =
    useState<JamSessionMessageWithProfile[]>(initialMessages);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isHostRef = useRef(isHost);

  // Keep isHost ref updated
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const sharedNow = useSharedClock();
  // La grille du metronome : l'instant du premier temps, pour ce tempo et cette mesure.
  const startAtRef = useRef<number | null>(null);
  const gridKeyRef = useRef<string | null>(null);
  const signatureRef = useRef(`${session.time_signature_beats}/${session.time_signature_value}`);
  const countInBeatsRef = useRef(0);
  const songStartRef = useRef<number | null>(null);
  const [songStartAt, setSongStartAt] = useState<number | null>(null);
  const [countInMeasures, setCountInMeasures] = useState<JamCountIn>(1);

  // Metronome hook - will be synced
  const metronome = useMetronome({
    initialBpm: session.bpm,
    initialTimeSignature: {
      beats: session.time_signature_beats,
      noteValue: session.time_signature_value,
    },
  });

  // Setup Realtime channel
  useEffect(() => {
    const channel = supabase.channel(`jam:${sessionId}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: true },
      },
    });

    // Presence tracking
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<JamPresenceState>();
      const users = Object.values(state).flat();
      setParticipants(users);
    });

    // Broadcast events for sync
    channel.on(
      "broadcast",
      { event: "metronome_sync" },
      ({ payload }: { payload: Record<string, unknown> }) => {
        // L'hote tient deja sa propre grille.
        if (isHostRef.current) return;

        const bpm = payload.bpm as number;
        const beats = payload.time_signature_beats as number;
        const noteValue = payload.time_signature_value as number;

        metronome.setBpm(bpm);
        // Ce message revient toutes les 5 s : changer la mesure remet les accents a zero.
        if (signatureRef.current !== `${beats}/${noteValue}`) {
          signatureRef.current = `${beats}/${noteValue}`;
          metronome.setTimeSignature({ beats, noteValue });
        }

        if (payload.is_playing && typeof payload.start_at === "number") {
          const countInBeats = typeof payload.count_in_beats === "number" ? payload.count_in_beats : 0;
          metronome.alignTo({ startAt: payload.start_at, now: sharedNow, bpm, beatsPerMeasure: beats, countInBeats });
          const songStart =
            typeof payload.song_start_at === "number"
              ? payload.song_start_at
              : songStartFrom(payload.start_at, countInBeats, bpm);
          setSongStartAt((current) => (current === songStart ? current : songStart));
        } else {
          metronome.stop();
          setSongStartAt(null);
        }
      }
    );

    channel.on(
      "broadcast",
      { event: "song_change" },
      ({ payload }: { payload: Record<string, unknown> }) => {
        setSession((prev) => ({
          ...prev,
          current_song_index: payload.song_index as number | null,
          current_song_id: payload.song_id as string | null,
          current_song_title: payload.song_title as string | null,
          current_song_artist: payload.song_artist as string | null,
        }));
      }
    );

    channel.on(
      "broadcast",
      { event: "session_status" },
      ({ payload }: { payload: Record<string, unknown> }) => {
        setSession((prev) => ({
          ...prev,
          status: payload.status as JamSession["status"],
        }));
      }
    );

    // Postgres changes for messages
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "jam_session_messages",
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        // Fetch profile for new message
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", payload.new.user_id)
          .single();

        if (profile) {
          const newMessage: JamSessionMessageWithProfile = {
            ...(payload.new as JamSessionMessageWithProfile),
            profile: profile as Profile,
          };
          setMessages((prev) =>
            prev.some((message) => message.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      }
    );

    // Postgres changes for session updates
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "jam_sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        setSession((prev) => ({
          ...prev,
          ...payload.new,
        }));
      }
    );

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userId,
          username: userProfile.username,
          display_name: userProfile.display_name,
          avatar_url: userProfile.avatar_url,
          online_at: new Date().toISOString(),
        });
        setIsConnected(true);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId]);

  const broadcastMetronome = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "metronome_sync",
      payload: {
        bpm: metronome.bpm,
        time_signature_beats: metronome.timeSignature.beats,
        time_signature_value: metronome.timeSignature.noteValue,
        is_playing: metronome.isPlaying,
        start_at: startAtRef.current,
        count_in_beats: countInBeatsRef.current,
        song_start_at: songStartRef.current,
      },
    });
  }, [metronome.bpm, metronome.timeSignature.beats, metronome.timeSignature.noteValue, metronome.isPlaying]);

  /*
   * Pose une nouvelle grille, assez loin pour que le message arrive a temps.
   * Au depart, le decompte ouvre la grille et le morceau commence apres lui.
   * Un tempo change en jouant repart sans decompte, et le morceau garde son
   * debut : les sections ne reviennent pas au debut.
   */
  const startGrid = useCallback(
    (withCountIn: boolean) => {
      const startAt = sharedNow() + GRID_LEAD_MS;
      const countInBeats = withCountIn ? countInMeasures * metronome.timeSignature.beats : 0;
      startAtRef.current = startAt;
      countInBeatsRef.current = countInBeats;
      gridKeyRef.current = `${metronome.bpm}/${metronome.timeSignature.beats}`;
      if (withCountIn || songStartRef.current === null) {
        songStartRef.current = songStartFrom(startAt, countInBeats, metronome.bpm);
        setSongStartAt(songStartRef.current);
      }
      metronome.alignTo({
        startAt,
        now: sharedNow,
        bpm: metronome.bpm,
        beatsPerMeasure: metronome.timeSignature.beats,
        countInBeats,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sharedNow, countInMeasures, metronome.bpm, metronome.timeSignature.beats, metronome.alignTo]
  );

  const stopMetronome = useCallback(() => {
    startAtRef.current = null;
    gridKeyRef.current = null;
    countInBeatsRef.current = 0;
    songStartRef.current = null;
    setSongStartAt(null);
    metronome.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.stop]);

  // Bouton de l'hote : le metronome part sur la grille, chez lui comme chez les autres.
  const toggleMetronome = useCallback(() => {
    if (metronome.isPlaying) stopMetronome();
    else startGrid(true);
  }, [metronome.isPlaying, stopMetronome, startGrid]);

  // Les retardataires et la derive : l'hote redit la grille tant que ca joue.
  useEffect(() => {
    if (!isHost || !metronome.isPlaying) return;
    const timer = setInterval(broadcastMetronome, GRID_REPEAT_MS);
    return () => clearInterval(timer);
  }, [isHost, metronome.isPlaying, broadcastMetronome]);

  // Sync metronome state (host broadcasts)
  const syncMetronome = useCallback(() => {
    if (!channelRef.current) return;

    // Tempo ou mesure changes en jouant : une nouvelle grille pour tout le monde.
    const gridKey = `${metronome.bpm}/${metronome.timeSignature.beats}`;
    if (metronome.isPlaying && gridKeyRef.current !== gridKey) startGrid(false);

    broadcastMetronome();

    // Also persist to database
    supabase
      .from("jam_sessions")
      .update({
        bpm: metronome.bpm,
        time_signature_beats: metronome.timeSignature.beats,
        time_signature_value: metronome.timeSignature.noteValue,
        is_metronome_playing: metronome.isPlaying,
      })
      .eq("id", sessionId)
      .then();
  }, [
    metronome.bpm,
    metronome.timeSignature.beats,
    metronome.timeSignature.noteValue,
    metronome.isPlaying,
    sessionId,
    supabase,
    startGrid,
    broadcastMetronome,
  ]);

  // Change current song
  const changeSong = useCallback(
    (
      index: number,
      songId: string | null,
      title: string | null,
      artist: string | null
    ) => {
      if (!channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "song_change",
        payload: {
          song_index: index,
          song_id: songId,
          song_title: title,
          song_artist: artist,
        },
      });

      // Also persist to database
      supabase
        .from("jam_sessions")
        .update({
          current_song_index: index,
          current_song_id: songId,
          current_song_title: title,
          current_song_artist: artist,
        })
        .eq("id", sessionId)
        .then();
    },
    [sessionId, supabase]
  );

  // Update session status
  const updateSessionStatus = useCallback(
    (status: "waiting" | "active" | "paused" | "ended") => {
      if (!channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "session_status",
        payload: { status },
      });

      // Persist to database
      const updateData: Record<string, unknown> = { status };
      if (status === "active") {
        updateData.started_at = new Date().toISOString();
      }
      if (status === "ended") {
        updateData.ended_at = new Date().toISOString();
      }

      supabase.from("jam_sessions").update(updateData).eq("id", sessionId).then();
    },
    [sessionId, supabase]
  );

  // Send chat message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const { error } = await supabase.from("jam_session_messages").insert({
        session_id: sessionId,
        user_id: userId,
        content: content.trim(),
      });

      if (error) {
        console.error("Error sending message:", error);
      }
    },
    [sessionId, userId, supabase]
  );

  return {
    session,
    isConnected,
    participants,
    messages,
    metronome,
    sharedNow,
    songStartAt,
    countInMeasures,
    setCountInMeasures,
    syncMetronome,
    toggleMetronome,
    stopMetronome,
    changeSong,
    updateSessionStatus,
    sendMessage,
  };
}
