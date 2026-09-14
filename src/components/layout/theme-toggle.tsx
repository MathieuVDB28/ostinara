"use client";

import { useTheme } from "next-themes";

/**
 * Trois etats, pas deux : « Systeme » doit rester atteignable.
 * Un reglage d'apparence propre a l'app qui ignore le choix systeme
 * donne l'impression que l'app est cassee (cf. HIG, Dark Mode).
 */
const OPTIONS = [
  { value: "system", label: "Système", icon: "computer" },
  { value: "light", label: "Clair", icon: "light_mode" },
  { value: "dark", label: "Sombre", icon: "dark_mode" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // defaultTheme vaut "system" : serveur et premier rendu client
  // s'accordent, pas besoin d'un garde de montage.
  const current = theme ?? "system";

  return (
    <div
      role="radiogroup"
      aria-label="Apparence"
      className="flex items-center gap-1 rounded-xl border border-border p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = current === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {option.icon}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
