"use client";

import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { UserPlan, SubscriptionStatus } from "@/types";
import { PLANS } from "@/lib/stripe/config";

interface SubscriptionStatusProps {
  plan: UserPlan;
  status?: SubscriptionStatus;
  periodEnd?: string;
  compact?: boolean;
}

export function SubscriptionStatusBadge({
  plan,
  status,
  periodEnd,
  compact = false,
}: SubscriptionStatusProps) {
  const t = useTranslations("plans.status");
  const intlLocale = useIntlLocale();
  const config = PLANS[plan];

  // Couleurs selon le plan
  const planColors = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/20 text-primary",
    band: "bg-primary/20 text-primary",
  };

  // Couleurs selon le statut
  const statusColors = {
    none: { bg: "bg-muted", text: "text-muted-foreground", label: "" as const },
    active: { bg: "bg-success/20", text: "text-success", label: "active" as const },
    trialing: { bg: "bg-chart-2/20", text: "text-chart-2", label: "trialing" as const },
    past_due: { bg: "bg-destructive/20", text: "text-destructive", label: "past_due" as const },
    canceled: { bg: "bg-primary/20", text: "text-primary", label: "canceled" as const },
    incomplete: { bg: "bg-primary/20", text: "text-primary", label: "incomplete" as const },
    incomplete_expired: { bg: "bg-destructive/20", text: "text-destructive", label: "incomplete_expired" as const },
    unpaid: { bg: "bg-destructive/20", text: "text-destructive", label: "unpaid" as const },
    paused: { bg: "bg-muted/20", text: "text-muted-foreground", label: "paused" as const },
  } satisfies Record<SubscriptionStatus, { bg: string; text: string; label: string }>;

  const statusInfo = status ? statusColors[status] : null;
  // La cle du libelle ; vide pour « none », qui ne s'affiche pas.

  // Formater la date de fin de période
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] ${planColors[plan]}`}
      >
        {config.name}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-display text-lg font-extrabold uppercase tracking-[0.04em] ${planColors[plan]}`}
        >
          {config.name}
        </span>
        {statusInfo && statusInfo.label && (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase ${statusInfo.bg} ${statusInfo.text}`}
          >
            {t(statusInfo.label)}
          </span>
        )}
      </div>

      {periodEnd && status === "active" && plan !== "free" && (
        <p className="text-sm text-muted-foreground">
          {t("renewsOn", { date: formatDate(periodEnd) })}
        </p>
      )}

      {periodEnd && status === "canceled" && plan !== "free" && (
        <p className="text-sm text-primary">
          {t("accessUntil", { date: formatDate(periodEnd) })}
        </p>
      )}

      {status === "past_due" && (
        <p className="text-sm text-destructive">
          {t("updatePayment")}
        </p>
      )}
    </div>
  );
}

// Composant pour afficher un résumé de l'abonnement dans les settings
export function SubscriptionSummary({
  plan,
  status,
  periodEnd,
  onManage,
  onUpgrade,
}: SubscriptionStatusProps & {
  onManage?: () => void;
  onUpgrade?: () => void;
}) {
  const t = useTranslations("plans");
  const config = PLANS[plan];
  const isFree = plan === "free";

  return (
    <div className="border-y border-border py-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("status.mySubscription")}</h3>
          <div className="mt-2">
            <SubscriptionStatusBadge
              plan={plan}
              status={status}
              periodEnd={periodEnd}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {!isFree && onManage && (
            <button
              onClick={onManage}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("status.manage")}
            </button>
          )}
          {isFree && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("status.goPro")}
            </button>
          )}
        </div>
      </div>

      {/* Features résumé */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          {t(`description.${plan}`)}
        </p>
        <ul className="flex flex-wrap gap-2">
          {config.features.slice(0, 3).map((feature, index) => (
            <li
              key={index}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {t(`features.${feature}`)}
            </li>
          ))}
          {config.features.length > 3 && (
            <li className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {t("status.more", { count: config.features.length - 3 })}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
