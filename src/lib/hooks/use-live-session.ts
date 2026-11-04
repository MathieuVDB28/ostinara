"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendLiveMessage } from "@/lib/actions/live-sessions";
import type { LiveSession, LiveSessionHost, LiveSessionMessage } from "@/lib/live-session";

/**
 * Le direct, cote navigateur. Trois canaux distincts : qui regarde
 * (Presence), l'etat de la session et le chat (postgres_changes, soumis a
 * la RLS : un compte Free n'y recoit rien).
 */

const NOBODY: LiveSessionHost[] = [];

/** Ceux qui regardent. Le musicien ecoute sans se compter (`viewer` absent). */
export function useLiveAudience(sessionId: string | null, viewer?: LiveSessionHost): LiveSessionHost[] {
  // Rangee avec sa session : celle d'avant ne deborde pas sur la suivante.
  const [audience, setAudience] = useState<{ sessionId: string; people: LiveSessionHost[] } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    const channel = supabase.channel(`live-session:${sessionId}`, {
      config: { presence: { key: viewer?.id ?? "host" } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const seen = new Map<string, LiveSessionHost>();
      for (const presences of Object.values(channel.presenceState<LiveSessionHost>())) {
        for (const presence of presences) {
          if (presence.id) seen.set(presence.id, presence);
        }
      }
      setAudience({ sessionId, people: [...seen.values()] });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && viewer) void channel.track(viewer);
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, viewer]);

  return audience && audience.sessionId === sessionId ? audience.people : NOBODY;
}

/** L'etat de la session, tenu a jour pour un ami Pro/Band. */
export function useLiveSessionState(initial: LiveSession): LiveSession {
  const [session, setSession] = useState(initial);
  const sessionId = initial.id;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-session-state:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession((current) => ({ ...current, ...(payload.new as Partial<LiveSession>) }))
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return session;
}

/** Le chat d'une session : chargement initial, nouveaux messages, envoi. */
export function useLiveChat(sessionId: string, initial: LiveSessionMessage[]) {
  const [messages, setMessages] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-session-chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const row = payload.new as Omit<LiveSessionMessage, "profile">;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          setMessages((current) =>
            current.some((message) => message.id === row.id)
              ? current
              : [...current, { ...row, profile: profile ?? null }]
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const send = useCallback((content: string) => sendLiveMessage(sessionId, content), [sessionId]);

  return { messages, send, setMessages };
}
