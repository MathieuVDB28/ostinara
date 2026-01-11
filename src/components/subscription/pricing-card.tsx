"use client";

import { UserPlan } from "@/types";
import { PLANS, BillingInterval, formatPrice } from "@/lib/stripe/config";

interface PricingCardProps {
  plan: UserPlan;
  interval: BillingInterval;
  currentPlan?: UserPlan;
  onSelect: (plan: UserPlan) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PricingCard({
  plan,
  interval,
  currentPlan,
  onSelect,
  loading,
  disabled,
}: PricingCardProps) {
  const config = PLANS[plan];
  const isCurrentPlan = currentPlan === plan;
  const isPro = plan === "pro";
  const isFree = plan === "free";

  const price = isFree
    ? 0
    : interval === "monthly"
    ? config.monthly?.price || 0
    : config.yearly?.price || 0;

  const monthlyEquivalent = interval === "yearly" && !isFree
    ? Math.round((price / 12) * 100) / 100
    : null;

  // Déterminer le texte du bouton
  const planOrder: Record<UserPlan, number> = { free: 0, pro: 1, band: 2 };
  let buttonText = "Commencer";

  if (isCurrentPlan) {
    buttonText = "Plan actuel";
  } else if (currentPlan) {
    const isUpgrade = planOrder[plan] > planOrder[currentPlan];
    const isDowngrade = planOrder[plan] < planOrder[currentPlan];

    if (isUpgrade) {
      buttonText = "Passer à ce plan";
    } else if (isDowngrade) {
      buttonText = isFree ? "Passer au gratuit" : "Changer de plan";
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        isPro
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card"
      } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
    >
      {/* Badge populaire */}
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Populaire
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold">{config.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
      </div>

      {/* Prix */}
      <div className="mb-6">
        {isFree ? (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">Gratuit</span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">{price}€</span>
            <span className="ml-1 text-muted-foreground">
              /{interval === "monthly" ? "mois" : "an"}
            </span>
          </div>
        )}
        {monthlyEquivalent && (
          <p className="mt-1 text-sm text-muted-foreground">
            soit {monthlyEquivalent.toFixed(2)}€/mois
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-3">
        {config.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || loading || disabled}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
          isCurrentPlan
            ? "cursor-default bg-muted text-muted-foreground"
            : isPro
            ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Chargement...
          </span>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
