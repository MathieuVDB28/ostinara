"use client";

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
  const config = PLANS[plan];

  // Couleurs selon le plan
  const planColors = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-amber-500/20 text-amber-400",
    band: "bg-purple-500/20 text-purple-400",
  };

  // Couleurs selon le statut
  const statusColors: Record<SubscriptionStatus, { bg: string; text: string; label: string }> = {
    none: { bg: "bg-muted", text: "text-muted-foreground", label: "" },
    active: { bg: "bg-green-500/20", text: "text-green-400", label: "Actif" },
    trialing: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Essai" },
    past_due: { bg: "bg-red-500/20", text: "text-red-400", label: "Paiement en retard" },
    canceled: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Annulé" },
    incomplete: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Incomplet" },
    incomplete_expired: { bg: "bg-red-500/20", text: "text-red-400", label: "Expiré" },
    unpaid: { bg: "bg-red-500/20", text: "text-red-400", label: "Impayé" },
    paused: { bg: "bg-gray-500/20", text: "text-gray-400", label: "En pause" },
  };

  const statusInfo = status ? statusColors[status] : null;

  // Formater la date de fin de période
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${planColors[plan]}`}
      >
        {config.name}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${planColors[plan]}`}
        >
          {config.name}
        </span>
        {statusInfo && statusInfo.label && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
          >
            {statusInfo.label}
          </span>
        )}
      </div>

      {periodEnd && status === "active" && plan !== "free" && (
        <p className="text-sm text-muted-foreground">
          Renouvellement le {formatDate(periodEnd)}
        </p>
      )}

      {periodEnd && status === "canceled" && plan !== "free" && (
        <p className="text-sm text-yellow-400">
          Accès jusqu'au {formatDate(periodEnd)}
        </p>
      )}

      {status === "past_due" && (
        <p className="text-sm text-red-400">
          Veuillez mettre à jour votre moyen de paiement
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
  const config = PLANS[plan];
  const isFree = plan === "free";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mon abonnement</h3>
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
              Gérer
            </button>
          )}
          {isFree && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Passer Pro
            </button>
          )}
        </div>
      </div>

      {/* Features résumé */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          {config.description}
        </p>
        <ul className="flex flex-wrap gap-2">
          {config.features.slice(0, 3).map((feature, index) => (
            <li
              key={index}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {feature}
            </li>
          ))}
          {config.features.length > 3 && (
            <li className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              +{config.features.length - 3} autres
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
