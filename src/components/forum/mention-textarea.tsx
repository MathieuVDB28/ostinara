"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mentionQueryAt } from "@/lib/mentions";
import { suggestMentions } from "@/lib/actions/forum";

interface Suggestion {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  /** Le sujet en cours : ses participants passent en premier. */
  topicId?: string;
}

/**
 * Une zone de texte qui propose des pseudos quand on tape « @ ».
 * Fleches pour choisir, Entree ou Tab pour inserer, Echap pour fermer.
 */
export function MentionTextarea({ value, onChange, topicId, className = "", ...props }: Props) {
  const t = useTranslations("forum");
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [query, setQuery] = useState<{ query: string; start: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await suggestMentions(query.query, topicId);
      if (!cancelled) {
        setSuggestions(result);
        setActive(0);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, topicId]);

  const open = query !== null && suggestions.length > 0;

  function track(text: string, caret: number) {
    const next = mentionQueryAt(text, caret);
    setQuery(next);
    if (!next) setSuggestions([]);
  }

  function insert(username: string) {
    if (!query) return;
    const caret = query.start + 1 + query.query.length;
    const next = `${value.slice(0, query.start)}@${username} ${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    setSuggestions([]);
    const position = query.start + username.length + 2;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(position, position);
    });
  }

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={ref}
        value={value}
        className={className}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => track(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((index) => (index + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insert(suggestions[active].username);
          } else if (e.key === "Escape") {
            setQuery(null);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("mentionSuggestions")}
          className="absolute right-0 left-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.username} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(suggestion.username)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${index === active ? "bg-accent" : ""}`}
              >
                {suggestion.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={suggestion.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-muted" />
                )}
                <span className="font-semibold">@{suggestion.username}</span>
                {suggestion.display_name && suggestion.display_name !== suggestion.username && (
                  <span className="truncate text-muted-foreground">{suggestion.display_name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
