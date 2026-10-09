"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

/**
 * Trois etats, pas deux : « Systeme » doit rester atteignable.
 * Un reglage d'apparence propre a l'app qui ignore le choix systeme
 * donne l'impression que l'app est cassee (cf. HIG, Dark Mode).
 */
const OPTIONS = [
  { value: "system", label: "Système", Icon: Monitor },
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
] as const;

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Le defaut est « light » mais le choix enregistre vit dans le
  // localStorage, que le serveur ne voit pas : sans garde de montage,
  // l'option cochee au premier rendu client ne correspondrait pas au HTML.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const current = mounted ? theme ?? "light" : null;

  return (
    <div
      role="radiogroup"
      aria-label="Apparence"
      className="flex items-center gap-1 rounded-xl border border-border p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = current === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isActive
                ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
