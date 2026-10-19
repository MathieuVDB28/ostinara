"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { applyToStaff, withdrawStaffApplication } from "@/lib/actions/staff";
import type { StaffApplication, StaffRole } from "@/types";

interface Props {
  role: StaffRole | null;
  application: StaffApplication | null;
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

/**
 * « Ecrire pour Ostinara » : on demande a rejoindre l'equipe editoriale
 * (blog + moderation du forum). Trois etats : deja de l'equipe, demande
 * en attente, ou formulaire (premiere demande, ou apres un refus).
 */
export function StaffApply({ role, application }: Props) {
  const t = useTranslations("staff.apply");
  const router = useRouter();
  const [motivation, setMotivation] = useState("");
  const [links, setLinks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await applyToStaff({ motivation, links });
      if (!result.success) setError(result.error ?? null);
      else router.refresh();
    });
  }

  function withdraw(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await withdrawStaffApplication(id);
      if (!result.success) setError(result.error ?? null);
      else router.refresh();
    });
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/profil/reglages"
        className="mb-3 inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <Icon name="chevron_left" className="h-4 w-4" />
        {t("back")}
      </Link>
      <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("title")}
      </h2>

      {role ? (
        <div className="space-y-3 py-3">
          <p className="text-sm">{t(role === "admin" ? "isAdmin" : "isEditor")}</p>
          {role === "admin" && (
            <Link
              href="/admin"
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("openAdmin")}
            </Link>
          )}
        </div>
      ) : application?.status === "pending" ? (
        <div className="space-y-3 py-3">
          <p className="text-sm">{t("pending")}</p>
          <blockquote className="whitespace-pre-line border-l-2 border-border pl-3 text-sm text-muted-foreground">
            {application.motivation}
          </blockquote>
          <button
            type="button"
            onClick={() => withdraw(application.id)}
            disabled={isPending}
            className="min-h-[44px] w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-60"
          >
            {t("withdraw")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 py-3">
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
          {application?.status === "declined" && (
            <p className="text-sm text-muted-foreground">{t("declinedBefore")}</p>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("motivation")}</span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={6}
              maxLength={2000}
              required
              placeholder={t("motivationPlaceholder")}
              className={field}
            />
            <span className="block text-right text-xs text-muted-foreground">
              {motivation.trim().length} / 2000
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("links")}</span>
            <input
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              maxLength={500}
              placeholder={t("linksPlaceholder")}
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={isPending || motivation.trim().length < 20}
            className="min-h-[44px] w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t("submit")}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
