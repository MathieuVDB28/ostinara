"use client";

import { useTranslations } from "next-intl";
import type { EnumsT } from "@/i18n/types";
import type { SessionMood } from "@/types";

interface MoodOption {
  value: SessionMood;
  emoji: string;
  color: string;
}

const moods: MoodOption[] = [
  { value: "frustrated", emoji: "😤", color: "text-destructive" },
  { value: "neutral", emoji: "😐", color: "text-muted-foreground" },
  { value: "good", emoji: "🙂", color: "text-chart-2" },
  { value: "great", emoji: "😊", color: "text-success" },
  { value: "on_fire", emoji: "🔥", color: "text-primary" },
];

/** L'emoji d'une humeur, pour la montrer ailleurs que dans le selecteur. */
export const MOOD_EMOJI = Object.fromEntries(moods.map((mood) => [mood.value, mood.emoji])) as Record<SessionMood, string>;

interface MoodSelectorProps {
  value: SessionMood | null;
  onChange: (mood: SessionMood | null) => void;
  size?: "sm" | "md" | "lg";
}

/**
 * L'humeur en un appui (style Atelier, docs/refonte-ui.md) : cinq cases
 * de meme largeur, l'emoji et son mot. Le choix se lit au cadre encre,
 * pas a un zoom ni a une teinte.
 */
export function MoodSelector({ value, onChange, size = "md" }: MoodSelectorProps) {
  const t = useTranslations("enums");
  const tp = useTranslations("progress");
  const emojiSize = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];

  return (
    <div role="radiogroup" aria-label={tp("mood")} className="grid grid-cols-5 gap-1.5">
      {moods.map((mood) => {
        const isActive = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(isActive ? null : mood.value)}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors ${
              isActive
                ? "border-foreground bg-secondary shadow-[inset_0_0_0_1px_var(--foreground)]"
                : "border-border hover:bg-accent"
            }`}
          >
            <span aria-hidden="true" className={emojiSize}>
              {mood.emoji}
            </span>
            <span className={`text-[11px] font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {t(`moodPick.${mood.value}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function getMoodEmoji(mood: SessionMood | null): string {
  if (!mood) return "";
  return moods.find(m => m.value === mood)?.emoji || "";
}

export function getMoodLabel(mood: SessionMood | null, t: EnumsT): string {
  if (!mood) return "";
  return t(`moodPick.${mood}`);
}
