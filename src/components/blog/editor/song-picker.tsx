"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { SongEmbedAttrs } from "@/lib/blog/document";

interface CatalogResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  deezer_id?: string;
  preview_url?: string | null;
}

interface Props {
  onPick: (song: SongEmbedAttrs) => void;
  onClose: () => void;
}

/** Choisir un morceau du catalogue (Deezer) a inserer dans l'article. */
export function SongPicker({ onPick, onClose }: Props) {
  const t = useTranslations("blog.editor");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults(await response.json());
      } catch {
        // requete annulee par la frappe suivante
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pickSong")}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-background p-4 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("pickSong")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-2 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchSong")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <ul className="mt-3 flex-1 divide-y divide-border overflow-y-auto">
          {loading && results.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">{t("searching")}</li>
          )}
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    deezerId: result.deezer_id ?? result.id,
                    title: result.title,
                    artist: result.artist,
                    album: result.album ?? null,
                    coverUrl: result.cover_url ?? null,
                    previewUrl: result.preview_url ?? null,
                  })
                }
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-accent/50"
              >
                <Cover src={result.cover_url} className="h-10 w-10 rounded-md" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{result.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
