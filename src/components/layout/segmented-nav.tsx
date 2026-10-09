"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeSegment, type BadgeCounts, type NavTab } from "@/lib/navigation";

/**
 * Une forme par domaine (docs/refonte-ui.md) :
 * - `segmented` : Biblio, style Etagere — controle segmente borde.
 * - `underline` : Jouer et Profil, style Atelier — onglets soulignes.
 * - `pills` : Commu, style Fanzine — pastilles, l'active en encre pleine.
 */
export type SegmentedNavVariant = "segmented" | "underline" | "pills";

interface SegmentedNavProps {
  tab: NavTab;
  badges?: BadgeCounts;
  variant?: SegmentedNavVariant;
  className?: string;
}

const CONTAINER: Record<SegmentedNavVariant, string> = {
  segmented: "grid auto-cols-fr grid-flow-col gap-0.5 rounded-xl border border-border bg-card p-[3px]",
  underline: "flex gap-6 border-b border-border",
  pills: "flex gap-1.5",
};

const ITEM: Record<SegmentedNavVariant, { base: string; active: string; idle: string }> = {
  segmented: {
    base: "flex min-h-[36px] items-center justify-center gap-1.5 rounded-[9px] px-3 text-sm font-semibold",
    active: "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
    idle: "text-muted-foreground hover:text-foreground",
  },
  underline: {
    base: "flex min-h-[40px] items-center gap-1.5 pb-2.5 pt-1 text-sm font-semibold",
    active: "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]",
    idle: "text-muted-foreground hover:text-foreground",
  },
  pills: {
    base: "flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold",
    active: "bg-foreground text-background",
    idle: "bg-secondary text-muted-foreground hover:text-foreground",
  },
};

/**
 * Le second — et dernier — niveau de navigation. Un seul rang de segments
 * sous l'onglet : l'app empilait jusqu'a trois barres d'onglets
 * (barre du bas + onglets de page + filtres de statut).
 */
export function SegmentedNav({ tab, badges = {}, variant = "segmented", className = "" }: SegmentedNavProps) {
  const pathname = usePathname();
  const current = activeSegment(tab, pathname);
  const item = ITEM[variant];

  return (
    <div
      role="navigation"
      aria-label={`Sections ${tab.label}`}
      className={`overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${CONTAINER[variant]} ${className}`}
    >
      {tab.segments.map((segment) => {
        const isActive = current?.href === segment.href;
        const badge = segment.badgeKey ? badges[segment.badgeKey] ?? 0 : 0;

        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap transition-colors ${item.base} ${isActive ? item.active : item.idle}`}
          >
            <span>{segment.label}</span>
            {badge > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
