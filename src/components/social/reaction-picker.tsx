"use client";

import { useState } from "react";
import { EmojiPicker } from "frimousse";
import { Icon } from "@/components/ui/icon";

/** Les reactions d'un geste, en tete du selecteur. */
export const QUICK_REACTIONS = ["🔥", "👏", "🎸", "❤️", "😍", "🤘"];

interface ReactionPickerProps {
  /** Emojis deja poses par l'utilisateur courant, surlignes. */
  selected: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * Le popover de reactions : la rangee rapide, puis, derriere
 * « Tous les emojis », le catalogue complet avec recherche et categories.
 *
 * Le catalogue (frimousse) charge ses donnees emojibase a l'ouverture et
 * les garde en localStorage : la rangee rapide reste instantanee.
 *
 * A placer dans un parent `relative`. Sur mobile le popover se detache en
 * panneau au-dessus de la barre d'onglets : ancre au bouton, le catalogue
 * deborderait de l'ecran des que le bouton n'est pas a gauche.
 */
export function ReactionPicker({ selected, onSelect, onClose }: ReactionPickerProps) {
  const [showAll, setShowAll] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-80">
        <div className="flex items-center gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent ${
                selected.includes(emoji) ? "bg-primary/15" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            aria-label="Tous les emojis"
            aria-expanded={showAll}
            className={`ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
              showAll ? "bg-accent text-foreground" : ""
            }`}
          >
            <Icon name={showAll ? "expand_less" : "expand_more"} className="h-5 w-5" />
          </button>
        </div>

        {showAll && (
          <EmojiPicker.Root
            locale="fr"
            columns={8}
            onEmojiSelect={({ emoji }) => onSelect(emoji)}
            className="flex h-72 flex-col border-t border-border pt-2"
          >
            <EmojiPicker.Search
              placeholder="Rechercher un emoji"
              className="mb-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <EmojiPicker.Viewport className="relative flex-1 outline-none">
              <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Chargement…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Aucun emoji trouvé
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="select-none pb-1"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="bg-card px-1 pb-1 pt-2 text-xs font-medium text-muted-foreground"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="scroll-my-1" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      type="button"
                      className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg text-lg data-[active]:bg-accent ${
                        selected.includes(emoji.emoji) ? "bg-primary/15" : ""
                      }`}
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        )}
      </div>
    </>
  );
}
