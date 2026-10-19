"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { getBlogExercises } from "@/lib/actions/blog";
import type { ExerciseEmbedAttrs } from "@/lib/blog/document";

interface Props {
  onPick: (exercise: ExerciseEmbedAttrs) => void;
  onClose: () => void;
}

/** Choisir un exercice systeme a inserer dans l'article. */
export function ExercisePicker({ onPick, onClose }: Props) {
  const t = useTranslations("blog.editor");
  const te = useTranslations("enums");
  const [exercises, setExercises] = useState<ExerciseEmbedAttrs[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getBlogExercises().then(setExercises);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!exercises || !q) return exercises ?? [];
    return exercises.filter((exercise) =>
      [exercise.name, exercise.nameEn, exercise.category].some((value) => value?.toLowerCase().includes(q))
    );
  }, [exercises, query]);

  const label = (key: string, fallback: string) => (te.has(key as never) ? te(key as never) : fallback);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pickExercise")}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-background p-4 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("pickExercise")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-2 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchExercise")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <ul className="mt-3 flex-1 divide-y divide-border overflow-y-auto">
          {exercises === null && <li className="py-3 text-sm text-muted-foreground">{t("searching")}</li>}
          {filtered.map((exercise) => (
            <li key={exercise.exerciseId}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="w-full py-2.5 text-left hover:bg-accent/50"
              >
                <span className="block text-sm font-semibold">{exercise.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[
                    label(`exerciseCategory.${exercise.category}`, exercise.category),
                    label(`difficulty.${exercise.difficulty}`, exercise.difficulty),
                    `${exercise.startingBpm} → ${exercise.targetBpm} BPM`,
                    exercise.instruments.length
                      ? exercise.instruments.map((i) => label(`instrument.${i}`, i)).join(", ")
                      : t("allInstruments"),
                  ].join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
