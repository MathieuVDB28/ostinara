"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";
import { activeSegment, type BadgeCounts, type NavTab } from "@/lib/navigation";

interface SegmentedNavProps {
  tab: NavTab;
  badges?: BadgeCounts;
}

/**
 * Le second — et dernier — niveau de navigation. Un seul rang de segments
 * sous l'onglet : l'app empilait jusqu'a trois barres d'onglets
 * (barre du bas + onglets de page + filtres de statut).
 */
export function SegmentedNav({ tab, badges = {} }: SegmentedNavProps) {
  const pathname = usePathname();
  const current = activeSegment(tab, pathname);

  return (
    <div
      role="navigation"
      aria-label={`Sections ${tab.label}`}
      className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-accent/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tab.segments.map((segment) => {
        const isActive = current?.href === segment.href;
        const badge = segment.badgeKey ? badges[segment.badgeKey] ?? 0 : 0;

        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <NavIcon icon={segment.icon} className="h-4 w-4 shrink-0" />
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
