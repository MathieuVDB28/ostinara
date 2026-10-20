"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationSetting, PracticeRemindersSetting, ShareSessionsSetting } from "./notification-setting";
import { SubscriptionStatusBadge } from "@/components/subscription";
import type { UserProfile } from "@/types";
import { Icon } from "@/components/ui/icon";
import { instrumentLabel, sortInstruments } from "@/lib/instruments";

interface SettingsListProps {
  profile: UserProfile;
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
export function SettingsList({ profile }: SettingsListProps) {
  const t = useTranslations("profile.settings");
  const te = useTranslations("enums");
  const instruments = sortInstruments(profile.instruments ?? []);

  const account: SettingsRow[] = [
    {
      href: "/profile/edit",
      label: t("profile"),
      description: t("profileHint"),
      icon: "person",
    },
    {
      href: "/profil/reglages/instruments",
      label: t("instruments"),
      description: instruments.length
        ? instruments.map((entry) => instrumentLabel(entry, te)).join(" · ")
        : t("instrumentsEmpty"),
      icon: "music_note",
    },
    {
      href: "/profile/edit?tab=privacy",
      label: t("privacy"),
      description: profile.is_private
        ? t("private")
        : t("friendsOnly"),
      icon: "lock",
    },
    // L'equipe editoriale : on y postule, ou l'on y est deja
    {
      href: "/profil/reglages/equipe",
      label: t("staff"),
      description: profile.staff_role
        ? t(profile.staff_role === "admin" ? "staffAdmin" : "staffEditor")
        : t("staffHint"),
      icon: "edit",
    },
    ...(profile.staff_role === "admin"
      ? [{ href: "/admin", label: t("admin"), description: t("adminHint"), icon: "group" }]
      : []),
  ];

  return (
    <div className="max-w-2xl space-y-7">
      {/* Abonnement */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("subscription")}
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
            {profile.plan === "free" ? t("upgrade") : t("manage")}
          </Link>
        </div>
      </section>

      {/* Compte */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("account")}
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
          {t("notifications")}
        </h2>
        <div className="divide-y divide-border border-b border-border">
          <NotificationSetting />
          <PracticeRemindersSetting initialOn={profile.practice_reminders !== false} />
          <ShareSessionsSetting initialOn={profile.share_sessions !== false} />
        </div>
      </section>

      {/* Apparence : le bouton de theme n'existait que dans la sidebar desktop */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("appearance")}
        </h2>
        <div className="py-3">
          <ThemeToggle />
        </div>
      </section>

      {/* Langue : choisie a l'inscription d'apres le pays, modifiable ici */}
      <section>
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("language")}
        </h2>
        <div className="space-y-2 py-3">
          <LocaleSwitcher variant="full" />
          <p className="text-xs text-muted-foreground">{t("languageHint")}</p>
        </div>
      </section>

      {/* Session */}
      <section>
        <LogoutButton
          label={t("logout")}
          className="min-h-[44px] w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        />
      </section>

      <p className="px-1 pb-2 text-center text-xs text-muted-foreground">
        {t("loggedAs", { username: profile.username ?? "" })}
      </p>
    </div>
  );
}
