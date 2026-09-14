"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";
import { NAV_TABS, coversPath, tabBadgeTotal, type BadgeCounts } from "@/lib/navigation";

interface BottomTabBarProps {
  badges: BadgeCounts;
}

export function BottomTabBar({ badges }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_TABS.map((tab) => {
          const isActive = coversPath(tab.href, pathname);
          const badge = tabBadgeTotal(tab, badges);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {/*
                L'etat actif est porte par une forme — pastille pleine —
                et pas seulement par la teinte : bg-primary/10 tombait a
                1.03:1 sur fond sombre, l'onglet actif devenait invisible.
              */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <NavIcon icon={tab.icon} className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium">{tab.label}</span>
              {badge > 0 && (
                <span
                  className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground"
                  aria-label={`${badge} notification${badge > 1 ? "s" : ""}`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
