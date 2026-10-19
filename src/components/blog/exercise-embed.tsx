"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Dumbbell, Pause, Play } from "lucide-react";
import { useMetronome } from "@/lib/hooks/use-metronome";
import type { ExerciseEmbedAttrs } from "@/lib/blog/document";

interface Props {
  exercise: ExerciseEmbedAttrs;
  signedIn: boolean;
}

/** « 6/8 » → 6 temps ; 4 a defaut. */
function beatsOf(timeSignature: string | undefined): number {
  const beats = Number(timeSignature?.split("/")[0]);
  return Number.isFinite(beats) && beats >= 1 && beats <= 12 ? beats : 4;
}

/**
 * Un exercice cite dans un article : sa fiche (rubrique, niveau, tempo de
 * depart et objectif), un clic au tempo de depart pour l'essayer tout de
 * suite, et « Le travailler dans Jouer », qui l'ouvre avec son suivi de
 * progression (ou mene a l'inscription).
 */
export function ExerciseEmbed({ exercise, signedIn }: Props) {
  const t = useTranslations("blog.embed");
  const te = useTranslations("enums");
  const locale = useLocale();
  const beats = beatsOf(exercise?.timeSignature);
  const startingBpm = Math.min(300, Math.max(30, Number(exercise?.startingBpm) || 60));
  const metronome = useMetronome({
    initialBpm: startingBpm,
    initialTimeSignature: { beats, noteValue: Number(exercise?.timeSignature?.split("/")[1]) || 4 },
  });

  if (!exercise?.exerciseId || !exercise.name) return null;

  const name = (locale === "en" && exercise.nameEn) || exercise.name;
  const description = (locale === "en" && exercise.descriptionEn) || exercise.description;
  // Libelles d'enum : une valeur inconnue (enum elargi plus tard) reste brute
  const category = te.has(`exerciseCategory.${exercise.category}` as never)
    ? te(`exerciseCategory.${exercise.category}` as never)
    : exercise.category;
  const difficulty = te.has(`difficulty.${exercise.difficulty}` as never)
    ? te(`difficulty.${exercise.difficulty}` as never)
    : exercise.difficulty;

  return (
    <div className="not-prose my-6 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Dumbbell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
            {t("exercise")} · {category} · {difficulty}
          </p>
          <p className="font-semibold">{name}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={metronome.toggle}
          aria-label={metronome.isPlaying ? t("stop") : t("start")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
        >
          {metronome.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <p className="flex-1 font-mono text-sm font-semibold tabular-nums">
          {t("tempoRange", { from: startingBpm, to: exercise.targetBpm, signature: exercise.timeSignature })}
        </p>
        <Link
          href={signedIn ? `/jouer?exercise=${encodeURIComponent(exercise.exerciseId)}` : "/register"}
          className="inline-flex min-h-[40px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t(signedIn ? "practiceIt" : "practiceItSignUp")}
        </Link>
      </div>
    </div>
  );
}
