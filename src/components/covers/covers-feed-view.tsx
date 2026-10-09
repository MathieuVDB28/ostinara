"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverFeedCard } from "./cover-feed-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ensureSongForCoverReply } from "@/lib/actions/covers";
import type { CoverFeedItem, Song } from "@/types";
import { ArrowUpRight, LoaderCircle } from "lucide-react";

// AddCoverModal entraine video-upload → tus-js-client → @ffmpeg. Rien de
// cela n'est necessaire pour *lire* le feed : on ne le charge qu'au moment
// ou l'on decide de repondre.
const AddCoverModal = dynamic(() =>
  import("./add-cover-modal").then((m) => m.AddCoverModal)
);

/**
 * Le feed de covers.
 *
 * Les covers vivaient dans un sous-segment de la bibliotheque, rangees
 * comme un inventaire personnel. C'est pourtant le seul contenu vraiment
 * social de l'app — celui qui justifiait l'« inspiration Instagram » du
 * cahier des charges. Ici : une colonne, les tiennes et celles de tes
 * amis, la reaction en un geste et la reponse en cover a cote.
 */

type FeedFilter = "all" | "friends" | "mine";

const FILTERS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "friends", label: "Mes amis" },
  { value: "mine", label: "Moi" },
];

interface CoversFeedViewProps {
  initialItems: CoverFeedItem[];
  currentUserId: string;
  /** Les morceaux de l'utilisateur, pour rattacher une reponse. */
  songs: Song[];
  canUpload: boolean;
  uploadBlockedReason?: string;
}

export function CoversFeedView({
  initialItems,
  currentUserId,
  songs,
  canUpload,
  uploadBlockedReason,
}: CoversFeedViewProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FeedFilter>("all");

  // La cible d'une reponse en cours de preparation.
  const [replyTo, setReplyTo] = useState<CoverFeedItem | null>(null);
  const [replySong, setReplySong] = useState<Song | null>(null);
  const [preparingReply, setPreparingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const visible = items.filter((item) => {
    if (filter === "mine") return item.isOwn;
    if (filter === "friends") return !item.isOwn;
    return true;
  });

  /**
   * Preparer une reponse.
   *
   * Une cover se rattache toujours a un morceau de sa propre bibliotheque.
   * Repondre a la cover d'un ami suppose donc d'avoir le morceau : s'il
   * manque, on l'ajoute — c'est le geste qu'on ferait de toute facon, et
   * il n'a aucune raison d'etre un prealable manuel.
   */
  const handleReply = useCallback(
    async (item: CoverFeedItem) => {
      if (!canUpload) {
        setReplyError(
          uploadBlockedReason ??
            "Tu as atteint la limite de covers de ton plan."
        );
        return;
      }

      setReplyError(null);
      setPreparingReply(true);

      const known = songs.find(
        (song) =>
          song.title.toLowerCase() === item.song?.title?.toLowerCase() &&
          song.artist.toLowerCase() === item.song?.artist?.toLowerCase()
      );

      if (known) {
        setReplySong(known);
        setReplyTo(item);
        setPreparingReply(false);
        return;
      }

      const result = await ensureSongForCoverReply(item.id);
      setPreparingReply(false);

      if (!result.success || !result.songId) {
        setReplyError(result.error ?? "Impossible de préparer la réponse");
        return;
      }

      // Le morceau vient d'etre cree : on le fabrique localement plutot
      // que d'attendre un aller-retour de plus. La page se rafraichira
      // apres la publication.
      setReplySong({
        id: result.songId,
        user_id: currentUserId,
        title: item.song?.title ?? "Morceau",
        artist: item.song?.artist ?? "",
        cover_url: item.song?.cover_url,
        status: "learning",
        progress_percent: 0,
        tuning: item.song?.tuning ?? "Standard",
        capo_position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setReplyTo(item);
    },
    [canUpload, uploadBlockedReason, songs, currentUserId]
  );

  const closeReply = () => {
    setReplyTo(null);
    setReplySong(null);
  };

  return (
    <div>
      {/*
        Filtres et lien vers l'archive sur une rangee. Le titre « Covers »
        repetait la pastille juste au-dessus.
      */}
      <div className="mb-3 flex items-center gap-1.5">
        {items.length > 0 &&
          FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`inline-flex h-8 shrink-0 items-center rounded-full border border-border px-3 text-xs font-semibold transition-colors ${
                filter === option.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        <Link
          href="/biblio/covers"
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Mes covers
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {replyError && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {replyError}
        </p>
      )}

      {preparingReply && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-[18px] w-[18px] animate-spin" strokeWidth={2} aria-hidden="true" />
          Préparation de ta réponse…
        </p>
      )}

      {visible.length > 0 ? (
        <div className="-mx-4 sm:mx-auto sm:max-w-xl">
          {visible.map((item) => (
            <CoverFeedCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onReply={handleReply}
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <EmptyState
          compact
          icon="videocam"
          title="Rien sous ce filtre"
          description="Tes covers et celles de tes amis sont rangées ailleurs."
          actions={[
            {
              label: "Tout voir",
              primary: true,
              onClick: () => setFilter("all"),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon="videocam"
          title="Le feed est vide"
          description="Une cover, c'est ta version d'un morceau. Publie la tienne, ou ajoute des amis pour voir les leurs."
          actions={[
            {
              label: "Publier une cover",
              icon: "videocam",
              primary: true,
              href: "/biblio",
            },
            { label: "Trouver des amis", icon: "users", href: "/commu/amis" },
          ]}
          hint="Seules les covers réglées sur « Amis » ou « Public » arrivent ici. Les privées restent dans ta bibliothèque."
        />
      )}

      {replyTo && replySong && (
        <AddCoverModal
          song={replySong}
          isOpen
          replyToCoverId={replyTo.id}
          replyToLabel={`${replyTo.author.display_name || replyTo.author.username} · ${replyTo.song?.title ?? ""}`}
          onClose={closeReply}
          onSuccess={() => {
            closeReply();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
