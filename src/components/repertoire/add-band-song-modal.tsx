"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/ui/cover";
import { createBandSong } from "@/lib/actions/band-songs";
import { bandSongHref } from "@/lib/band-songs";

interface CatalogResult {
  id: string;
  title: string;
  artist: string;
  cover_url?: string;
  deezer_id?: string;
}

interface AddBandSongModalProps {
  bandId: string;
  onClose: () => void;
}

const INPUT =
  "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary";

/** Ajouter un morceau au repertoire : depuis le catalogue, ou tel que tape. */
export function AddBandSongModal({ bandId, onClose }: AddBandSongModalProps) {
  const t = useTranslations("repertoire.addModal");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults(await response.json());
      } catch {
        // requete annulee par la frappe suivante
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const add = async (song: { title: string; artist: string | null; cover_url: string | null; deezer_id: string | null }) => {
    setAdding(true);
    setError(null);
    const result = await createBandSong(bandId, song);
    if (!result.success || !result.bandSongId) {
      setError(result.error ?? null);
      setAdding(false);
      return;
    }
    router.push(bandSongHref(bandId, result.bandSongId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-band-song-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-band-song-title" className="font-display text-3xl font-extrabold uppercase leading-none">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          autoComplete="off"
          autoFocus
          disabled={adding}
          className={INPUT}
        />

        {trimmed.length >= 2 && (
          <ul className="mt-2 divide-y divide-border">
            {results.slice(0, 6).map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  disabled={adding}
                  onClick={() =>
                    add({
                      title: result.title,
                      artist: result.artist,
                      cover_url: result.cover_url ?? null,
                      deezer_id: result.deezer_id ?? result.id,
                    })
                  }
                  className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left hover:bg-accent/50 disabled:opacity-50"
                >
                  <Cover src={result.cover_url} className="h-9 w-9 shrink-0 rounded-[3px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{result.artist}</span>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                disabled={adding}
                onClick={() => add({ title: trimmed, artist: null, cover_url: null, deezer_id: null })}
                className="flex min-h-[44px] w-full items-center gap-2 py-2 text-left text-sm font-semibold hover:bg-accent/50 disabled:opacity-50"
              >
                <Icon name="add" className="h-4 w-4" />
                {adding ? t("adding") : t("addAsTyped", { title: trimmed })}
              </button>
            </li>
          </ul>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
