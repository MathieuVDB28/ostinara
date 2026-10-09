"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { NavIcon } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";
import { useCommandPalette } from "@/components/search/command-palette";
import {
  DESKTOP_TABS,
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
 * Meme structure que la barre du bas : quatre onglets, un seul niveau.
 * La sidebar listait 12 entrees a plat derriere des sections repliables,
 * ce qui ne correspondait a rien de ce que voyait l'utilisateur mobile.
 */
export function DesktopSidebar({ badges, userInfo }: DesktopSidebarProps) {
  const pathname = usePathname();
  const { open: openCommandPalette } = useCommandPalette();

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
      {/*
        La recherche est un onglet sur mobile et une palette ici : sur
        desktop, cmd-K va plus vite qu'un aller-retour vers une page, et
        le bouton existe pour qui ne connait pas le raccourci.
      */}
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-input px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <NavIcon icon="search" className="h-5 w-5 shrink-0" />
          <span className="flex-1">Rechercher…</span>
          <kbd className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {DESKTOP_TABS.map((tab) => {
            const isTabActive = coversPath(tab.href, pathname);
            const tabBadge = tabBadgeTotal(tab, badges);

            /*
              Un seul niveau ici : les sections de l'onglet vivent dans
              l'en-tete de la page (SegmentedNav). Les lister aussi dans la
              sidebar empilait deux navigations pour le meme choix.
            */
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isTabActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${
                  isTabActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <NavIcon icon={tab.icon} className="h-5 w-5" />
                <span className="flex-1">{tab.label}</span>
                {tabBadge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                    {tabBadge}
                  </span>
                )}
              </Link>
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
        <LogoutButton
          label="Déconnexion"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        />
      </div>
    </aside>
  );
}
