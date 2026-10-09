"use client";

import type { SessionMood } from "@/types";

interface MoodOption {
  value: SessionMood;
  emoji: string;
  label: string;
  color: string;
}

const moods: MoodOption[] = [
  { value: "frustrated", emoji: "😤", label: "Frustré", color: "text-destructive" },
  { value: "neutral", emoji: "😐", label: "Normal", color: "text-muted-foreground" },
  { value: "good", emoji: "🙂", label: "Bien", color: "text-chart-2" },
  { value: "great", emoji: "😊", label: "Super", color: "text-success" },
  { value: "on_fire", emoji: "🔥", label: "On fire!", color: "text-primary" },
];

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
  const emojiSize = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];

  return (
    <div role="radiogroup" aria-label="Humeur" className="grid grid-cols-5 gap-1.5">
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
              {mood.label}
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

export function getMoodLabel(mood: SessionMood | null): string {
  if (!mood) return "";
  return moods.find(m => m.value === mood)?.label || "";
}
