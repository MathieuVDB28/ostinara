"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlan, SubscriptionStatus } from "@/types";
import { BillingInterval, PLANS } from "@/lib/stripe/config";
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
  const router = useRouter();
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header avec retour */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/profile/edit"
          className="rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Mon abonnement</h1>
          <p className="text-sm text-muted-foreground">
            Gérez votre plan et votre facturation
          </p>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-6 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
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
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Plan actuel</h2>
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
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {portalLoading ? (
                  <span className="flex items-center gap-2">
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
                  <>
                    <span className="mr-2">Gérer la facturation</span>
                    <svg
                      className="inline h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Changer de plan */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">
          {subscription?.plan === "free" ? "Passer à un plan payant" : "Changer de plan"}
        </h2>

        {/* Toggle */}
        <div className="mb-6">
          <PlanToggle interval={interval} onIntervalChange={setInterval} />
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3">
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
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-400"
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
