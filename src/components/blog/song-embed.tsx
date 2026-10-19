"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { ListenLink } from "@/components/ui/listen-link";
import { addSongToLibrary } from "@/lib/actions/songs";
import type { SongEmbedAttrs } from "@/lib/blog/document";

interface Props {
  song: SongEmbedAttrs;
  signedIn: boolean;
}

const button =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60";

/**
 * Un morceau cite dans un article : de la lecture a la pratique.
 *
 * Connecte, « Ajouter a ma biblio » le range dans sa bibliotheque. Sans
 * compte, le meme bouton mene a l'inscription : c'est la conversion du blog.
 */
export function SongEmbed({ song, signedIn }: Props) {
  const t = useTranslations("blog.embed");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!song?.title) return null;

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addSongToLibrary({
        title: song.title,
        artist: song.artist,
        album: song.album ?? undefined,
        cover_url: song.coverUrl ?? undefined,
        deezer_id: song.deezerId ?? undefined,
      });
      if (result.success) setAdded(true);
      else setError(result.error ?? null);
    });
  }

  return (
    <div className="not-prose my-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Cover src={song.coverUrl} className="h-16 w-16 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{song.title}</p>
          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {song.deezerId && <ListenLink href={`https://www.deezer.com/track/${song.deezerId}`} />}
        {signedIn ? (
          <button type="button" onClick={add} disabled={isPending || added} className={button}>
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {added ? t("added") : t("addToLibrary")}
          </button>
        ) : (
          <Link href="/register" className={button}>
            <Plus className="h-4 w-4" />
            {t("learnIt")}
          </Link>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
