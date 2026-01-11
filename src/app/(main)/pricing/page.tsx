"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlan } from "@/types";
import { BillingInterval, PLANS } from "@/lib/stripe/config";
import { PlanToggle, PricingCard } from "@/components/subscription";

export default function PricingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<UserPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (plan: UserPlan) => {
    if (plan === "free") {
      // Rediriger vers la page d'inscription si non connecté
      router.push("/register");
      return;
    }

    setLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création de la session");
      }

      if (data.action === "updated") {
        // L'abonnement a été mis à jour directement
        router.push("/account/subscription?success=true");
        return;
      }

      if (data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Choisissez votre plan</h1>
        <p className="mt-3 text-muted-foreground">
          Débloquez tout le potentiel de Tunora pour progresser plus vite
        </p>
      </div>

      {/* Toggle mensuel/annuel */}
      <div className="mb-10">
        <PlanToggle interval={interval} onIntervalChange={setInterval} />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        <PricingCard
          plan="free"
          interval={interval}
          onSelect={handleSelectPlan}
          loading={loading === "free"}
          disabled={loading !== null}
        />
        <PricingCard
          plan="pro"
          interval={interval}
          onSelect={handleSelectPlan}
          loading={loading === "pro"}
          disabled={loading !== null}
        />
        <PricingCard
          plan="band"
          interval={interval}
          onSelect={handleSelectPlan}
          loading={loading === "band"}
          disabled={loading !== null}
        />
      </div>

      {/* FAQ ou infos supplémentaires */}
      <div className="mt-12 text-center">
        <h2 className="mb-4 text-xl font-semibold">Questions fréquentes</h2>
        <div className="mx-auto max-w-2xl space-y-4 text-left">
          <details className="group rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-medium">
              Puis-je changer de plan à tout moment ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Oui ! Vous pouvez upgrader ou downgrader votre abonnement quand vous
              le souhaitez. Le prorata est calculé automatiquement.
            </p>
          </details>

          <details className="group rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-medium">
              Comment fonctionne le remboursement si je downgrade ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Si vous passez à un plan inférieur, la différence est créditée sur
              votre prochaine facture. Le changement est effectif immédiatement.
            </p>
          </details>

          <details className="group rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-medium">
              Que se passe-t-il si j'annule mon abonnement ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous gardez l'accès à toutes les fonctionnalités payantes jusqu'à
              la fin de votre période de facturation. Ensuite, vous repassez au
              plan Free.
            </p>
          </details>

          <details className="group rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-medium">
              Quels moyens de paiement acceptez-vous ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Nous acceptons toutes les cartes bancaires (Visa, Mastercard,
              American Express) via notre partenaire sécurisé Stripe.
            </p>
          </details>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Paiement sécurisé par Stripe</span>
      </div>
    </div>
  );
}
