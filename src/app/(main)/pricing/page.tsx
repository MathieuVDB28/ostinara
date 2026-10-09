"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlan } from "@/types";
import { BillingInterval } from "@/lib/stripe/config";
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
    <div className="mx-auto max-w-5xl">
      {/* En-tete, style Fanzine : le titre en capitales condensees, a gauche */}
      <div className="mb-8">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
          Choisis ton <span className="text-primary">plan</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Débloque tout Ostinara pour progresser plus vite.
        </p>
      </div>

      {/* Toggle mensuel/annuel */}
      <div className="mb-8">
        <PlanToggle interval={interval} onIntervalChange={setInterval} />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-8 md:grid-cols-3 md:gap-6">
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
      <div className="mt-14 max-w-2xl">
        <h2 className="mb-2 font-display text-3xl font-extrabold uppercase leading-none">Questions fréquentes</h2>
        <div className="border-t border-border">
          <details className="group border-b border-border py-3.5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              Puis-je changer de plan à tout moment ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Oui. Tu peux monter ou descendre de plan quand tu veux. Le prorata est calculé automatiquement.
            </p>
          </details>

          <details className="group border-b border-border py-3.5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              Comment fonctionne le remboursement si je downgrade ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Si tu passes à un plan inférieur, la différence est créditée sur
              ta prochaine facture. Le changement est effectif immédiatement.
            </p>
          </details>

          <details className="group border-b border-border py-3.5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              Que se passe-t-il si j&apos;annule mon abonnement ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu gardes l&apos;accès à toutes les fonctionnalités payantes jusqu&apos;à
              la fin de ta période de facturation. Ensuite, tu repasses au
              plan Free.
            </p>
          </details>

          <details className="group border-b border-border py-3.5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              Quels moyens de paiement acceptez-vous ?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Toutes les cartes bancaires sont acceptées (Visa, Mastercard,
              American Express) via notre partenaire sécurisé Stripe.
            </p>
          </details>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <span>Paiement sécurisé par Stripe</span>
      </div>
    </div>
  );
}
