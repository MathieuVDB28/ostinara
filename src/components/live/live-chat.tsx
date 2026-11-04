"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { LIVE_MESSAGE_MAX_LENGTH, type LiveSessionMessage } from "@/lib/live-session";

interface LiveChatProps {
  messages: LiveSessionMessage[];
  currentUserId: string;
  onSend: (content: string) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

/** Le chat d'une session en direct, cote ami comme cote musicien. */
export function LiveChat({ messages, currentUserId, onSend, className = "" }: LiveChatProps) {
  const t = useTranslations("live.chat");
  const intlLocale = useIntlLocale();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    const result = await onSend(input);
    if (result.success) setInput("");
    else setError(result.error ?? t("failed"));
    setSending(false);
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto py-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          messages.map((message) => {
            const own = message.user_id === currentUserId;
            return (
              <div key={message.id} className={own ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {message.profile?.display_name || message.profile?.username || t("someone")}
                  </span>{" "}
                  {new Date(message.created_at).toLocaleTimeString(intlLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p
                  className={`mt-0.5 inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-left text-sm ${
                    own ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p role="status" className="pb-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="flex gap-2 border-t border-border pt-3">
        <input
          type="text"
          value={input}
          maxLength={LIVE_MESSAGE_MAX_LENGTH}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
        />
        <button
          type="submit"
          aria-label={t("send")}
          disabled={!input.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
