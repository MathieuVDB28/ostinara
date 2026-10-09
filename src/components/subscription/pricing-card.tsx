"use client";

import { Check, LoaderCircle } from "lucide-react";
import { UserPlan } from "@/types";
import { PLANS, BillingInterval } from "@/lib/stripe/config";

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

  /*
   * Une colonne de tarif, style Atelier (docs/refonte-ui.md) : le nom en
   * condense, le prix en grand, les fonctions en lignes. Pro se distingue
   * par un trait d'encre en tete et le seul bouton ambre de la page.
   */
  return (
    <div
      className={`relative flex flex-col border-t-2 pt-5 ${
        isPro ? "border-foreground" : "border-border"
      }`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{config.name}</h3>
        {isCurrentPlan ? (
          <span className="rounded border border-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
            Ton plan
          </span>
        ) : (
          isPro && (
            <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-background">
              Populaire
            </span>
          )
        )}
      </div>
      <p className="text-sm text-muted-foreground">{config.description}</p>

      <div className="mb-5 mt-5">
        {isFree ? (
          <span className="font-display text-6xl font-extrabold leading-none">0€</span>
        ) : (
          <p className="tabular flex items-baseline">
            <span className="font-display text-6xl font-extrabold leading-none">{price}€</span>
            <span className="ml-1 text-sm font-semibold text-muted-foreground">
              /{interval === "monthly" ? "mois" : "an"}
            </span>
          </p>
        )}
        {monthlyEquivalent && (
          <p className="tabular mt-1 text-sm text-muted-foreground">
            soit {monthlyEquivalent.toFixed(2).replace(".", ",")}€/mois
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 border-t border-border">
        {config.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 border-b border-border py-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || loading || disabled}
        className={`min-h-[46px] w-full rounded-xl px-4 text-sm font-bold transition-opacity ${
          isCurrentPlan
            ? "cursor-default border border-border text-muted-foreground"
            : isPro
              ? "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              : "border border-border hover:bg-accent disabled:opacity-50"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
            Chargement…
          </span>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
