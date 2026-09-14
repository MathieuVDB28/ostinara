"use client";

import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SubscriptionStatusBadge } from "@/components/subscription";
import type { UserProfile } from "@/types";

interface SettingsListProps {
  profile: UserProfile;
  spotifyConnected: boolean;
}

interface SettingsRow {
  href: string;
  label: string;
  description: string;
  icon: string;
  value?: string;
}

function Row({ row }: { row: SettingsRow }) {
  return (
    <Link
      href={row.href}
      className="flex min-h-[56px] items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
    >
      <span
        aria-hidden="true"
        className="material-symbols-outlined shrink-0 text-[22px] text-muted-foreground"
      >
        {row.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{row.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {row.description}
        </span>
      </span>
      {row.value && (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {row.value}
        </span>
      )}
      <span
        aria-hidden="true"
        className="material-symbols-outlined shrink-0 text-[20px] text-muted-foreground"
      >
        chevron_right
      </span>
    </Link>
  );
}

/**
 * Reglages en liste, pas en onglets : c'est le troisieme niveau de
 * navigation, et une quatrieme barre d'onglets ici rendrait l'app
 * illisible. Chaque ligne pousse une vue de detail.
 */
export function SettingsList({ profile, spotifyConnected }: SettingsListProps) {
  const account: SettingsRow[] = [
    {
      href: "/profile/edit",
      label: "Mon profil",
      description: "Nom, bio, avatar, liens et vitrine",
      icon: "person",
    },
    {
      href: "/profile/edit?tab=privacy",
      label: "Confidentialité",
      description: profile.is_private
        ? "Profil privé"
        : "Profil visible par tes amis",
      icon: "lock",
    },
    {
      href: "/profile/edit?tab=integrations",
      label: "Spotify",
      description: spotifyConnected
        ? "Compte connecté"
        : "Non connecté",
      icon: "link",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Abonnement */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Abonnement
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3">
            <SubscriptionStatusBadge
              plan={profile.plan}
              status={profile.subscription_status}
              periodEnd={profile.subscription_period_end}
            />
          </div>
          <Link
            href="/account/subscription"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {profile.plan === "free" ? "Passer à un plan payant" : "Gérer mon abonnement"}
          </Link>
        </div>
      </section>

      {/* Compte */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Compte
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {account.map((row) => (
            <Row key={row.href} row={row} />
          ))}
        </div>
      </section>

      {/* Apparence : le bouton de theme n'existait que dans la sidebar desktop */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Apparence
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <ThemeToggle />
        </div>
      </section>

      {/* Session */}
      <section>
        <form action={logout}>
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-2xl border border-border px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Se déconnecter
          </button>
        </form>
      </section>

      <p className="px-1 pb-2 text-center text-xs text-muted-foreground">
        Connecté en tant que @{profile.username}
      </p>
    </div>
  );
}
