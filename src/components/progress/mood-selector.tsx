"use client";

import type { SessionMood } from "@/types";

interface MoodOption {
  value: SessionMood;
  emoji: string;
  label: string;
  color: string;
}

const moods: MoodOption[] = [
  { value: "frustrated", emoji: "😤", label: "Frustré", color: "text-red-400" },
  { value: "neutral", emoji: "😐", label: "Normal", color: "text-gray-400" },
  { value: "good", emoji: "🙂", label: "Bien", color: "text-blue-400" },
  { value: "great", emoji: "😊", label: "Super", color: "text-green-400" },
  { value: "on_fire", emoji: "🔥", label: "On fire!", color: "text-orange-400" },
];

interface MoodSelectorProps {
  value: SessionMood | null;
  onChange: (mood: SessionMood | null) => void;
  size?: "sm" | "md" | "lg";
}

export function MoodSelector({ value, onChange, size = "md" }: MoodSelectorProps) {
  const sizeClasses = {
    sm: "text-xl p-1.5",
    md: "text-2xl p-2",
    lg: "text-3xl p-3",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className={`
              ${sizeClasses[size]}
              rounded-xl transition-all duration-200
              ${value === mood.value
                ? "bg-primary/20 ring-2 ring-primary scale-110"
                : "bg-muted hover:bg-accent hover:scale-105"
              }
            `}
            title={mood.label}
          >
            <span role="img" aria-label={mood.label}>
              {mood.emoji}
            </span>
          </button>
        ))}
      </div>
      {value && (
        <p className={`text-center text-sm font-medium ${moods.find(m => m.value === value)?.color}`}>
          {moods.find(m => m.value === value)?.label}
        </p>
      )}
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
