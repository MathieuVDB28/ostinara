"use client";

import { useState, useRef, useEffect } from "react";
import { useBandChat } from "@/lib/hooks/use-band-chat";
import type { BandMessageWithProfile } from "@/types";

interface BandChatPanelProps {
  bandId: string;
  rehearsalId?: string | null;
  currentUserId: string;
  initialMessages: BandMessageWithProfile[];
  title?: string;
}

export function BandChatPanel({
  bandId,
  rehearsalId,
  currentUserId,
  initialMessages,
  title = "Chat",
}: BandChatPanelProps) {
  const { messages, isConnected, sendMessage } = useBandChat({
    bandId,
    rehearsalId,
    userId: currentUserId,
    initialMessages,
  });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    await sendMessage(input);
    setInput("");
    setSending(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: BandMessageWithProfile[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ date: msg.created_at, messages: [msg] });
      lastDate = msgDate;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden h-full">
      {/* Header */}
      <div className="border-b border-border p-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-zinc-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Connecte" : "Deconnecte"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined mb-2 text-3xl text-muted-foreground">
              chat_bubble_outline
            </span>
            <p className="text-sm text-muted-foreground">
              Aucun message pour l&apos;instant
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Commence la conversation !
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">
                  {formatDateSeparator(group.date)}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isOwn = msg.user_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary overflow-hidden">
                        {msg.profile.avatar_url ? (
                          <img
                            src={msg.profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (
                            msg.profile.display_name?.[0] ||
                            msg.profile.username[0]
                          ).toUpperCase()
                        )}
                      </div>

                      {/* Message */}
                      <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                        <div
                          className={`flex items-baseline gap-2 ${
                            isOwn ? "flex-row-reverse" : ""
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {msg.profile.display_name || msg.profile.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <p
                          className={`mt-1 rounded-lg px-3 py-1.5 text-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Envoyer un message..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            disabled={sending}
          />
          <button aria-label="Envoyer le message"
            type="submit"
            disabled={!input.trim() || sending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
