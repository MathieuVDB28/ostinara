"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";
import { NAV_TABS, coversPath, tabBadgeTotal, type BadgeCounts } from "@/lib/navigation";

interface BottomTabBarProps {
  badges: BadgeCounts;
}

/**
 * Pilule flottante, icones seules (docs/refonte-ui.md, decision « barre
 * du bas »). Le libelle reste lu par les lecteurs d'ecran.
 *
 * L'onglet actif est porte par une forme — une pastille plus large et
 * cernee — et non par l'ambre : l'ambre est reserve a l'action principale
 * de chaque ecran, la navigation n'en est pas une.
 */
export function BottomTabBar({ badges }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="glass fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-1 lg:hidden"
    >
      {NAV_TABS.map((tab) => {
        const isActive = coversPath(tab.href, pathname);
        const badge = tabBadgeTotal(tab, badges);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex h-11 items-center justify-center rounded-full transition-[width,background-color,color] duration-200 ${
              isActive
                ? "w-16 bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "w-[52px] text-muted-foreground hover:text-foreground"
            }`}
          >
            <NavIcon icon={tab.icon} className="h-[22px] w-[22px]" />
            <span className="sr-only">{tab.label}</span>
            {badge > 0 && (
              <span
                className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
                aria-label={`${badge} notification${badge > 1 ? "s" : ""}`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
