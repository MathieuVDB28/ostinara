"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSong } from "@/lib/actions/songs";
import type { AudioIdentificationResult } from "@/types";
import { Check } from "lucide-react";

interface IdentificationResultProps {
  result: AudioIdentificationResult;
  onRetry: () => void;
}

export function IdentificationResult({ result, onRetry }: IdentificationResultProps) {
  const t = useTranslations("audio.result");
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
      deezer_id: result.deezer_id,
      preview_url: result.preview_url,
      status: "want_to_learn",
    });

    setIsAdding(false);

    if (success) {
      setAdded(true);
    } else {
      setAddError(error || t("addFailed"));
    }
  };

  const handleGoToLibrary = () => {
    router.push("/biblio");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Song info card */}
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex gap-4 p-4">
          {/* Album art */}
          {result.cover_url ? (
            <Image
              src={result.cover_url}
              alt={result.album || result.title}
              className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
              width={80}
              height={80}
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

        {/* Trouve dans le catalogue */}
        {result.deezer_id && (
          <div className="border-t border-border px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs text-success">
              <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              {t("foundOnDeezer")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {added ? (
          <button
            onClick={handleGoToLibrary}
            className="w-full rounded-lg bg-success px-4 py-3 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("added")}
            </span>
          </button>
        ) : (
          <button
            onClick={handleAddToLibrary}
            disabled={isAdding}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isAdding ? t("adding") : t("add")}
          </button>
        )}

        {addError && (
          <p className="text-center text-sm text-destructive">{addError}</p>
        )}

        <button
          onClick={onRetry}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t("listenAgain")}
        </button>
      </div>
    </div>
  );
}
