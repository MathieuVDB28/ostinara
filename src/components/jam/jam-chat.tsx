"use client";

import { useState, useRef, useEffect } from "react";
import type { JamSessionMessageWithProfile } from "@/types";

interface JamChatProps {
  messages: JamSessionMessageWithProfile[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
}

export function JamChat({
  messages,
  currentUserId,
  onSendMessage,
}: JamChatProps) {
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
    await onSendMessage(input);
    setInput("");
    setSending(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-3">
        <h3 className="font-semibold">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucun message pour l&apos;instant
          </p>
        ) : (
          messages.map((msg) => {
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
                      msg.profile.display_name?.[0] || msg.profile.username[0]
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
                      isOwn ? "bg-primary text-primary-foreground" : "bg-accent"
                    }`}
                  >
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
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
          <button
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
