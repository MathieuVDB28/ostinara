"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationSetting } from "./notification-setting";
import { SubscriptionStatusBadge } from "@/components/subscription";
import type { UserProfile } from "@/types";
import { Icon } from "@/components/ui/icon";

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
      className="flex min-h-[56px] items-center gap-4 py-3 transition-colors hover:bg-accent/50"
    >
      <Icon name={row.icon} className="h-[22px] w-[22px] shrink-0 text-muted-foreground" />
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
      <Icon name="chevron_right" className="h-[20px] w-[20px] shrink-0 text-muted-foreground" />
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
    <div className="max-w-2xl space-y-7">
      {/* Abonnement */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Abonnement
        </h2>
        <div className="py-3">
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
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Compte
        </h2>
        <div className="divide-y divide-border border-b border-border">
          {account.map((row) => (
            <Row key={row.href} row={row} />
          ))}
        </div>
      </section>

      {/* Notifications : le bouton flottait sur toutes les pages, il vit ici */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Notifications
        </h2>
        <div className="border-b border-border">
          <NotificationSetting />
        </div>
      </section>

      {/* Apparence : le bouton de theme n'existait que dans la sidebar desktop */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Apparence
        </h2>
        <div className="py-3">
          <ThemeToggle />
        </div>
      </section>

      {/* Session */}
      <section>
        <LogoutButton
          label="Se déconnecter"
          className="min-h-[44px] w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        />
      </section>

      <p className="px-1 pb-2 text-center text-xs text-muted-foreground">
        Connecté en tant que @{profile.username}
      </p>
    </div>
  );
}
