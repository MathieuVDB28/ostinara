"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { NavIcon } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";
import {
  NAV_TABS,
  activeSegment,
  coversPath,
  tabBadgeTotal,
  type BadgeCounts,
} from "@/lib/navigation";

interface DesktopSidebarProps {
  badges: BadgeCounts;
  userInfo: {
    displayName: string;
    initial: string;
    email: string;
    avatarUrl?: string;
  };
}

/**
 * Meme structure que la barre du bas : quatre groupes, deux niveaux max.
 * La sidebar listait 12 entrees a plat derriere des sections repliables,
 * ce qui ne correspondait a rien de ce que voyait l'utilisateur mobile.
 */
export function DesktopSidebar({ badges, userInfo }: DesktopSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-border bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center">
          <Image
            src="/logo.png"
            alt="Ostinara"
            width={36}
            height={36}
            className="rounded-lg"
          />
        </div>
        <span className="text-xl font-extrabold text-primary">Ostinara</span>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {NAV_TABS.map((tab) => {
            const isTabActive = coversPath(tab.href, pathname);
            const current = activeSegment(tab, pathname);
            const tabBadge = tabBadgeTotal(tab, badges);

            return (
              <div key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={isTabActive && tab.segments.length === 0 ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isTabActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <NavIcon icon={tab.icon} className="h-5 w-5" />
                  <span className="flex-1">{tab.label}</span>
                  {tabBadge > 0 && !isTabActive && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                      {tabBadge}
                    </span>
                  )}
                </Link>

                {/* Segments : visibles seulement dans l'onglet courant */}
                {isTabActive && tab.segments.length > 0 && (
                  <div className="ml-2 space-y-0.5 border-l border-border/50 pl-2 pt-1">
                    {tab.segments.map((segment) => {
                      const isActive = current?.href === segment.href;
                      const badge = segment.badgeKey ? badges[segment.badgeKey] ?? 0 : 0;

                      return (
                        <Link
                          key={segment.href}
                          href={segment.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                        >
                          <NavIcon icon={segment.icon} className="h-4 w-4" />
                          <span>{segment.label}</span>
                          {badge > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Utilisateur : le profil est une page, plus une modale */}
      <div className="border-t border-border p-4">
        <Link
          href="/profil"
          className="mb-3 flex min-w-0 items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent"
        >
          {userInfo.avatarUrl ? (
            <img
              src={userInfo.avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {userInfo.initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{userInfo.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{userInfo.email}</div>
          </div>
        </Link>
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
