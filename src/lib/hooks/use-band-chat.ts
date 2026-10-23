"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BandMessageWithProfile, Profile } from "@/types";

interface UseBandChatOptions {
  bandId: string;
  rehearsalId?: string | null;
  userId: string;
  initialMessages: BandMessageWithProfile[];
}

interface UseBandChatReturn {
  messages: BandMessageWithProfile[];
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
}

export function useBandChat({
  bandId,
  rehearsalId,
  userId,
  initialMessages,
}: UseBandChatOptions): UseBandChatReturn {
  const supabase = createClient();
  const [messages, setMessages] = useState<BandMessageWithProfile[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Update messages if initialMessages changes (e.g. switching channels)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const channelName = rehearsalId
      ? `band-chat:${bandId}:${rehearsalId}`
      : `band-chat:${bandId}`;

    const channel = supabase.channel(channelName);

    // Realtime ne filtre que sur une colonne : on ecoute le groupe, et le
    // fil (general ou repetition) se trie dans le handler.
    // Listen for new messages via postgres_changes
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "band_messages",
        filter: `band_id=eq.${bandId}`,
      },
      async (payload) => {
        const newMsg = payload.new as { id: string; band_id: string; rehearsal_id: string | null; user_id: string; content: string; created_at: string };

        // Filter: only messages for our channel (general or specific rehearsal)
        if (rehearsalId && newMsg.rehearsal_id !== rehearsalId) return;
        if (!rehearsalId && newMsg.rehearsal_id !== null) return;

        // Fetch profile for new message
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, plan")
          .eq("id", newMsg.user_id)
          .single();

        if (profile) {
          const message: BandMessageWithProfile = {
            id: newMsg.id,
            band_id: newMsg.band_id,
            rehearsal_id: newMsg.rehearsal_id,
            user_id: newMsg.user_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            profile: profile as Profile,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      }
    );

    // Listen for deleted messages
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "band_messages",
        filter: `band_id=eq.${bandId}`,
      },
      (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [bandId, rehearsalId, supabase, userId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Insert directly via supabase client (realtime will pick it up)
      await supabase.from("band_messages").insert({
        band_id: bandId,
        rehearsal_id: rehearsalId || null,
        user_id: userId,
        content: content.trim(),
      });
    },
    [bandId, rehearsalId, userId, supabase]
  );

  return { messages, isConnected, sendMessage };
}
