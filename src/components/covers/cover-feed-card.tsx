"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toggleCoverReaction } from "@/lib/actions/activities";
import { ActivityComments } from "@/components/social/activity-comments";
import type { CoverFeedItem } from "@/types";

/**
 * Une cover dans le feed.
 *
 * L'app rangeait son seul contenu social dans un sous-segment de la
 * bibliotheque, entre les morceaux et les albums. Ici, la cover est
 * l'objet principal : la video occupe la carte, la reaction tient en un
 * geste — un double-tap sur la video ou un bouton sous le pouce — et
 * « Répondre en cover » est a cote, parce que c'est la reponse naturelle
 * a un guitariste qui joue.
 */

/** La reaction d'un geste. Les autres emojis restent derriere le selecteur. */
const QUICK_EMOJI = "🔥";

const PALETTE = ["🔥", "👏", "🎸", "❤️", "🤘"];

interface CoverFeedCardProps {
  item: CoverFeedItem;
  currentUserId: string;
  onReply: (item: CoverFeedItem) => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function CoverFeedCard({
  item,
  currentUserId,
  onReply,
}: CoverFeedCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showPalette, setShowPalette] = useState(false);
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTapRef = useRef(0);

  const [state, applyOptimistic] = useOptimistic(
    { reactions: item.reactions, mine: item.currentUserReactions },
    (current, emoji: string) => {
      const had = current.mine.includes(emoji);
      const reactions = [...current.reactions];
      const index = reactions.findIndex((reaction) => reaction.emoji === emoji);

      if (index >= 0) {
        const next = { ...reactions[index] };
        next.count += had ? -1 : 1;
        next.reacted = !had;
        if (next.count <= 0) reactions.splice(index, 1);
        else reactions[index] = next;
      } else {
        reactions.push({ emoji, count: 1, reacted: true });
      }

      return {
        reactions,
        mine: had
          ? current.mine.filter((value) => value !== emoji)
          : [...current.mine, emoji],
      };
    }
  );

  const react = (emoji: string) => {
    setShowPalette(false);
    setError(null);
    startTransition(async () => {
      applyOptimistic(emoji);
      const result = await toggleCoverReaction(item.id, emoji);
      if (!result.success) setError(result.error ?? "Réaction impossible");
    });
  };

  /**
   * Le double-tap sur la video.
   *
   * Sur mobile, la reaction doit couter un geste, pas trois. Un double-tap
   * ajoute le 🔥 ; il ne le retire jamais — retirer par accident une
   * reaction qu'on vient de poser serait la pire des surprises. Pour
   * retirer, on retouche la pastille.
   */
  const handleMediaPointer = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      lastTapRef.current = 0;
      if (!state.mine.includes(QUICK_EMOJI)) {
        setBurst(true);
        setTimeout(() => setBurst(false), 600);
        react(QUICK_EMOJI);
      }
      return;
    }
    lastTapRef.current = now;
  };

  const liked = state.mine.includes(QUICK_EMOJI);
  const authorName =
    item.author.display_name || item.author.username || "Guitariste";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Auteur */}
      <header className="flex items-center gap-3 p-3">
        {item.author.avatar_url ? (
          <img
            src={item.author.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
          >
            {authorName[0]?.toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {item.isOwn ? "Toi" : authorName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.song?.title ?? "Morceau inconnu"}
            {item.song?.artist ? ` · ${item.song.artist}` : ""}
          </p>
        </div>

        <time
          dateTime={item.created_at}
          className="shrink-0 text-xs text-muted-foreground"
        >
          {formatRelative(item.created_at)}
        </time>
      </header>

      {/* Ce a quoi cette cover repond */}
      {item.replyTo && (
        <p className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px]"
          >
            reply
          </span>
          En réponse à {item.replyTo.authorName} sur «&nbsp;
          {item.replyTo.songTitle}&nbsp;»
        </p>
      )}

      {/* Le media */}
      <div
        className="relative bg-muted"
        onPointerDown={handleMediaPointer}
      >
        {item.media_type === "video" ? (
          <video
            src={item.media_url}
            poster={item.thumbnail_url}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70vh] w-full bg-black object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-muted-foreground"
            >
              audiotrack
            </span>
            <audio src={item.media_url} controls className="w-full" />
          </div>
        )}

        {/* Le retour du double-tap : sans lui, le geste passe inapercu. */}
        {burst && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl"
          >
            {QUICK_EMOJI}
          </span>
        )}
      </div>

      {item.description && (
        <p className="px-3 pt-3 text-sm">{item.description}</p>
      )}

      {/* Les gestes */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => react(QUICK_EMOJI)}
          disabled={isPending}
          aria-pressed={liked}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            liked
              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
              : "border border-input hover:bg-accent"
          }`}
        >
          <span aria-hidden="true">{QUICK_EMOJI}</span>
          <span>{liked ? "Réagi" : "Réagir"}</span>
        </button>

        {/* Les autres reactions, derriere un geste de plus */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPalette((open) => !open)}
            aria-label="Autres réactions"
            aria-expanded={showPalette}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              add_reaction
            </span>
          </button>

          {showPalette && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPalette(false)}
              />
              <div className="absolute bottom-full left-0 z-50 mb-2 flex gap-1 rounded-xl border border-border bg-card p-2 shadow-lg">
                {PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent ${
                      state.mine.includes(emoji) ? "bg-primary/15" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onReply(item)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            videocam
          </span>
          Répondre en cover
        </button>

        <div className="flex-1" />

        {item.replyCount > 0 && (
          <span className="tabular inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[16px]"
            >
              reply
            </span>
            {item.replyCount} réponse{item.replyCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Les pastilles de reaction */}
      {state.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {state.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => react(reaction.emoji)}
              disabled={isPending}
              className={`tabular flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
                reaction.reacted
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span className="text-xs font-medium">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="px-3 pb-3 text-xs text-destructive">{error}</p>
      )}

      {/* Les commentaires portent leur propre depliage : un feed se
          parcourt, il ne se lit pas en entier. */}
      {item.activityId && (
        <div className="border-t border-border px-3 py-2">
          <ActivityComments
            activityId={item.activityId}
            commentCount={item.commentCount}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </article>
  );
}
