"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { AudioLines, Reply, SmilePlus, Video } from "lucide-react";
import { toggleCoverReaction } from "@/lib/actions/activities";
import { ActivityComments } from "@/components/social/activity-comments";
import { ReactionPicker } from "@/components/social/reaction-picker";
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

  const chip =
    "inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  /*
   * Style Fanzine (docs/refonte-ui.md) : plus de carte. La video occupe
   * toute la largeur, le titre du morceau est pose en capitales
   * condensees, la description est en serif — c'est la voix du musicien.
   */
  return (
    <article className="border-b border-border pb-4">
      <header className="flex items-center gap-2.5 px-4 py-3 sm:px-0">
        {item.author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-display text-sm font-extrabold text-muted-foreground"
          >
            {authorName[0]?.toUpperCase()}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-bold">{item.isOwn ? "Toi" : authorName}</span>{" "}
          <span className="text-muted-foreground">a posté une cover</span>
        </p>
        <time dateTime={item.created_at} className="shrink-0 text-xs text-muted-foreground">
          {formatRelative(item.created_at)}
        </time>
      </header>

      <div className="px-4 pb-2.5 sm:px-0">
        <p className="font-display text-[34px] font-extrabold uppercase leading-[0.9]">
          {item.song?.title ?? "Morceau inconnu"}
        </p>
        {item.song?.artist && (
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {item.song.artist}
          </p>
        )}
        {item.replyTo && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Reply className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            En réponse à {item.replyTo.authorName} sur «&nbsp;{item.replyTo.songTitle}&nbsp;»
          </p>
        )}
      </div>

      {/* Le media */}
      <div className="relative bg-black sm:overflow-hidden sm:rounded-md" onPointerDown={handleMediaPointer}>
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
          <div className="flex flex-col items-center gap-3 bg-secondary p-6">
            <AudioLines className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
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
        <p className="px-4 pt-3 font-serif text-[15px] italic leading-relaxed sm:px-0">
          <span className="mr-1 font-sans text-[13px] font-bold not-italic">
            {item.isOwn ? "Toi" : authorName}
          </span>
          {item.description}
        </p>
      )}

      {/* Les gestes */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-0">
        <button
          type="button"
          onClick={() => react(QUICK_EMOJI)}
          disabled={isPending}
          aria-pressed={liked}
          className={`${chip} ${liked ? "border-foreground bg-secondary" : "border-border hover:bg-accent"}`}
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
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SmilePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>

          {showPalette && (
            <ReactionPicker
              selected={state.mine}
              onSelect={react}
              onClose={() => setShowPalette(false)}
            />
          )}
        </div>

        <button type="button" onClick={() => onReply(item)} className={`${chip} border-border hover:bg-accent`}>
          <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Répondre en cover
        </button>

        <div className="flex-1" />

        {item.replyCount > 0 && (
          <span className="tabular inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Reply className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {item.replyCount} réponse{item.replyCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Les pastilles de reaction */}
      {state.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2.5 sm:px-0">
          {state.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => react(reaction.emoji)}
              disabled={isPending}
              aria-pressed={reaction.reacted}
              className={`tabular flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors ${
                reaction.reacted
                  ? "border-foreground bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span className="text-xs font-semibold">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-4 pt-2 text-xs text-destructive sm:px-0">{error}</p>}

      {/* Les commentaires portent leur propre depliage : un feed se
          parcourt, il ne se lit pas en entier. */}
      {item.activityId && (
        <div className="px-4 pt-2.5 sm:px-0">
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
