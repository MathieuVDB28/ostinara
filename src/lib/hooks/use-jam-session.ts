"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMetronome } from "./use-metronome";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  JamSession,
  JamSessionWithDetails,
  JamSessionMessageWithProfile,
  JamPresenceState,
  Profile,
} from "@/types";

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

  // Actions
  syncMetronome: () => void;
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
        // All clients (including host) apply the sync
        if (payload.bpm) metronome.setBpm(payload.bpm as number);
        if (payload.time_signature_beats && payload.time_signature_value) {
          metronome.setTimeSignature({
            beats: payload.time_signature_beats as number,
            noteValue: payload.time_signature_value as number,
          });
        }

        // Handle play/stop sync (only non-hosts follow the broadcast)
        if (!isHostRef.current) {
          if (payload.is_playing && !metronome.isPlaying) {
            metronome.start();
          } else if (!payload.is_playing && metronome.isPlaying) {
            metronome.stop();
          }
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
          setMessages((prev) => [...prev, newMessage]);
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

  // Sync metronome state (host broadcasts)
  const syncMetronome = useCallback(() => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "metronome_sync",
      payload: {
        bpm: metronome.bpm,
        time_signature_beats: metronome.timeSignature.beats,
        time_signature_value: metronome.timeSignature.noteValue,
        is_playing: metronome.isPlaying,
        start_time: Date.now(),
      },
    });

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
    syncMetronome,
    changeSong,
    updateSessionStatus,
    sendMessage,
  };
}
