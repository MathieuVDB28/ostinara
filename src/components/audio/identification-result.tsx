"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSong } from "@/lib/actions/songs";
import type { AudioIdentificationResult } from "@/types";

interface IdentificationResultProps {
  result: AudioIdentificationResult;
  onRetry: () => void;
}

export function IdentificationResult({ result, onRetry }: IdentificationResultProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddToLibrary = async () => {
    setIsAdding(true);
    setAddError(null);

    const { success, error } = await createSong({
      title: result.title,
      artist: result.artist,
      album: result.album,
      cover_url: result.cover_url,
      spotify_id: result.spotify_id,
      preview_url: result.preview_url,
      status: "want_to_learn",
    });

    setIsAdding(false);

    if (success) {
      setAdded(true);
    } else {
      setAddError(error || "Impossible d'ajouter le morceau");
    }
  };

  const handleGoToLibrary = () => {
    router.push("/library");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Song info card */}
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex gap-4 p-4">
          {/* Album art */}
          {result.cover_url ? (
            <img
              src={result.cover_url}
              alt={result.album || result.title}
              className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}

          {/* Song details */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="truncate text-lg font-semibold">{result.title}</h3>
            <p className="truncate text-sm text-muted-foreground">{result.artist}</p>
            {result.album && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{result.album}</p>
            )}
          </div>
        </div>

        {/* Spotify badge */}
        {result.spotify_id && (
          <div className="border-t border-border px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Trouvé sur Spotify
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {added ? (
          <button
            onClick={handleGoToLibrary}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ajouté ! Voir la bibliothèque
            </span>
          </button>
        ) : (
          <button
            onClick={handleAddToLibrary}
            disabled={isAdding}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isAdding ? "Ajout en cours..." : "Ajouter à ma bibliothèque"}
          </button>
        )}

        {addError && (
          <p className="text-center text-sm text-red-400">{addError}</p>
        )}

        <button
          onClick={onRetry}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Réécouter
        </button>
      </div>
    </div>
  );
}
