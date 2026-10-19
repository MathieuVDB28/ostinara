"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bookmark, Check, Plus } from "lucide-react";
import { addSongToLibrary } from "@/lib/actions/songs";
import { addToAlbumWishlist } from "@/lib/actions/album-wishlist";
import { useNextSteps } from "@/components/next-steps/next-steps-provider";
import type { ActivityWithDetails, Song } from "@/types";

interface FeedBridgeProps {
  activity: ActivityWithDetails;
  /** Le prenom affiche de l'ami, pour le defi propose ensuite. */
  friendName: string;
}

const button =
  "inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold transition-colors hover:bg-accent disabled:opacity-50";

/**
 * Du feed a sa propre pratique.
 *
 * Voir un ami maitriser un morceau, poster une cover ou noter un album
 * donne envie de s'y mettre : le geste est ici, sous l'activite, plutot
 * que de recopier le titre dans la recherche.
 */
export function FeedBridge({ activity, friendName }: FeedBridgeProps) {
  const song = songOf(activity);
  if (song) return <LearnToo song={song} friend={{ id: activity.user_id, name: friendName }} />;

  if (activity.type === "album_reviewed" && activity.albumReview) {
    return <ListenToo activity={activity} />;
  }

  return null;
}

/** Le morceau dont parle l'activite, s'il y en a un a apprendre. */
function songOf(activity: ActivityWithDetails): Song | null {
  switch (activity.type) {
    case "song_added":
    case "song_learning":
    case "song_mastered":
      return activity.song ?? null;
    case "cover_posted":
      return activity.cover?.song ?? null;
    default:
      return null;
  }
}

function LearnToo({ song, friend }: { song: Song; friend: { id: string; name: string } }) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const nextSteps = useNextSteps();
  const [state, setState] = useState<"idle" | "already">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await addSongToLibrary({
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover_url: song.cover_url,
        deezer_id: song.deezer_id,
      }, "want_to_learn", { from: "friend", label: friend.name });
      if (!result.success || !result.song) {
        setError(result.error || t("addFailed"));
      } else if (result.alreadyThere) {
        setState("already");
      } else {
        nextSteps.show({ kind: "song_added", song: result.song, from: friend });
      }
    });
  };

  if (state === "already") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.25} aria-hidden="true" />
        {t("alreadyInLibrary")}
        <Link href="/biblio" className="font-semibold text-foreground underline-offset-2 hover:underline">
          {t("see")}
        </Link>
      </p>
    );
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending} className={button}>
        <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
        {pending ? tc("adding") : t("learnToo")}
      </button>
      {error && <p role="status" className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ListenToo({ activity }: { activity: ActivityWithDetails }) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const review = activity.albumReview!;
  const [state, setState] = useState<"idle" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await addToAlbumWishlist({
        album_name: review.album_name,
        artist_name: review.artist_name,
        cover_url: review.cover_url,
        deezer_id: review.deezer_id,
        release_date: review.release_date,
        total_tracks: review.total_tracks,
      });
      // « Deja dans ta wishlist » ou « deja ecoute » : c'est un etat, pas un
      // echec — on le dit a la place du bouton.
      setState("done");
      setMessage(result.success ? null : result.error ?? null);
    });
  };

  if (state === "done") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.25} aria-hidden="true" />
        {message ?? t("inListenList")}
        <Link href="/biblio/albums" className="font-semibold text-foreground underline-offset-2 hover:underline">
          {t("see")}
        </Link>
      </p>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={button}>
      <Bookmark className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {pending ? tc("adding") : t("listenToo")}
    </button>
  );
}
