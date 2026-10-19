"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { useMetronome } from "@/lib/hooks/use-metronome";
import type { MetronomeEmbedAttrs } from "@/lib/blog/document";

interface Props {
  settings: MetronomeEmbedAttrs;
  signedIn: boolean;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/**
 * Un metronome dans l'article, regle par l'auteur (« travaille ce passage
 * a 80 BPM ») : on lance le clic sans quitter la lecture. Le lien mene au
 * metronome complet de l'onglet Jouer (ou a l'inscription).
 */
export function MetronomeEmbed({ settings, signedIn }: Props) {
  const t = useTranslations("blog.embed");
  const bpm = clamp(settings?.bpm, 30, 300, 80);
  const beats = clamp(settings?.beats, 1, 12, 4);
  const metronome = useMetronome({
    initialBpm: bpm,
    initialTimeSignature: { beats, noteValue: 4 },
  });

  return (
    <div className="not-prose my-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={metronome.toggle}
        aria-label={metronome.isPlaying ? t("stop") : t("start")}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        {metronome.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-2xl font-bold tabular-nums">
          {bpm} <span className="text-sm font-semibold text-muted-foreground">BPM · {beats}/4</span>
        </p>
        <div className="mt-1.5 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: beats }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                metronome.isPlaying && metronome.currentBeat === i + 1
                  ? i === 0 ? "bg-primary" : "bg-foreground"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
      <Link
        href={signedIn ? "/jouer" : "/register"}
        className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:block"
      >
        {t(signedIn ? "openMetronome" : "fullMetronome")}
      </Link>
    </div>
  );
}
