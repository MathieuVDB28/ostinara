"use client";

import { ChevronLeft, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlan, SubscriptionStatus } from "@/types";
import { BillingInterval } from "@/lib/stripe/config";
import {
  PlanToggle,
  PricingCard,
  SubscriptionStatusBadge,
} from "@/components/subscription";
import { getMyProfile } from "@/lib/actions/profile";

interface SubscriptionInfo {
  plan: UserPlan;
  status?: SubscriptionStatus;
  periodEnd?: string;
  stripeCustomerId?: string;
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<UserPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      setSuccess("Votre abonnement a été mis à jour avec succès !");
      // Recharger les données après un paiement réussi
      loadSubscription();
    }
  }, [isSuccess]);

  const loadSubscription = async () => {
    try {
      const profile = await getMyProfile();
      if (profile) {
        setSubscription({
          plan: profile.plan,
          status: profile.subscription_status as SubscriptionStatus | undefined,
          periodEnd: profile.subscription_period_end,
          stripeCustomerId: profile.stripe_customer_id,
        });
      }
    } catch (err) {
      console.error("Error loading subscription:", err);
      setError("Erreur lors du chargement de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: UserPlan) => {
    if (!subscription) return;

    // Si c'est le plan actuel, ne rien faire
    if (plan === subscription.plan) return;

    // Si on veut passer au plan Free, ouvrir le portal pour annuler
    if (plan === "free") {
      handleOpenPortal();
      return;
    }

    setActionLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du changement de plan");
      }

      if (data.action === "updated") {
        // L'abonnement a été mis à jour directement
        setSuccess("Votre abonnement a été mis à jour !");
        await loadSubscription();
        return;
      }

      if (data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'ouverture du portail");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* En-tete avec retour */}
      <Link
        href="/profil/reglages"
        className="-ml-1 mb-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        Réglages
      </Link>
      <div className="mb-8">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9]">Mon abonnement</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ton plan et ta facturation.</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-6 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Statut actuel */}
      {subscription && (
        <div className="mb-10 border-y border-border py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Plan actuel</h2>
              <SubscriptionStatusBadge
                plan={subscription.plan}
                status={subscription.status}
                periodEnd={subscription.periodEnd}
              />
            </div>

            {subscription.stripeCustomerId && (
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
              >
                {portalLoading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
                    Chargement…
                  </>
                ) : (
                  <>
                    Gérer la facturation
                    <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Changer de plan */}
      <div className="mb-8">
        <h2 className="mb-4 font-display text-3xl font-extrabold uppercase leading-none">
          {subscription?.plan === "free" ? "Passer à un plan payant" : "Changer de plan"}
        </h2>

        {/* Toggle */}
        <div className="mb-6">
          <PlanToggle interval={interval} onIntervalChange={setInterval} />
        </div>

        {/* Plans */}
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          <PricingCard
            plan="free"
            interval={interval}
            currentPlan={subscription?.plan}
            onSelect={handleSelectPlan}
            loading={actionLoading === "free"}
            disabled={actionLoading !== null}
          />
          <PricingCard
            plan="pro"
            interval={interval}
            currentPlan={subscription?.plan}
            onSelect={handleSelectPlan}
            loading={actionLoading === "pro"}
            disabled={actionLoading !== null}
          />
          <PricingCard
            plan="band"
            interval={interval}
            currentPlan={subscription?.plan}
            onSelect={handleSelectPlan}
            loading={actionLoading === "band"}
            disabled={actionLoading !== null}
          />
        </div>
      </div>

      {/* Informations sur le prorata */}
      {subscription?.plan !== "free" && (
        <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-chart-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Les changements de plan sont effectifs immédiatement. Si vous upgradez,
              vous ne payez que la différence au prorata. Si vous downgrade, le
              crédit sera appliqué sur votre prochaine facture.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
