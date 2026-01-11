import { UserPlan } from '@/types';

export type BillingInterval = 'monthly' | 'yearly';

export interface PlanConfig {
  name: string;
  description: string;
  features: string[];
  limits?: {
    songs: number;
    covers: number;
    friends: number;
    wishlist: number;
  };
  monthly?: {
    price: number;
  };
  yearly?: {
    price: number;
  };
}

export const PLANS: Record<UserPlan, PlanConfig> = {
  free: {
    name: 'Free',
    description: 'Pour découvrir Tunora',
    features: [
      '10 morceaux max',
      '3 covers max',
      '5 amis max',
      '20 morceaux wishlist',
    ],
    limits: {
      songs: 10,
      covers: 3,
      friends: 5,
      wishlist: 20,
    },
  },
  pro: {
    name: 'Pro',
    description: 'Pour les guitaristes sérieux',
    features: [
      'Morceaux illimités',
      'Covers illimités',
      'Amis illimités',
      'Wishlist illimitée',
      'Stats avancées',
      'Badge Pro',
    ],
    monthly: {
      price: 9,
    },
    yearly: {
      price: 86,
    },
  },
  band: {
    name: 'Band',
    description: 'Pour les groupes',
    features: [
      'Tout ce qui est dans Pro',
      'Espaces groupe',
      'Setlists partagées',
      'Badge Band',
    ],
    monthly: {
      price: 19,
    },
    yearly: {
      price: 182,
    },
  },
};

// Server-side only: get price ID from environment variables
export function getPriceIdFromEnv(plan: UserPlan, interval: BillingInterval): string | null {
  if (plan === 'free') return null;

  const priceIds: Record<string, string | undefined> = {
    'pro_monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
    'pro_yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
    'band_monthly': process.env.STRIPE_PRICE_BAND_MONTHLY,
    'band_yearly': process.env.STRIPE_PRICE_BAND_YEARLY,
  };

  return priceIds[`${plan}_${interval}`] || null;
}

// Server-side only: get plan from price ID
export function getPlanFromPriceId(priceId: string): UserPlan {
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_YEARLY
  ) {
    return 'pro';
  }
  if (
    priceId === process.env.STRIPE_PRICE_BAND_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_BAND_YEARLY
  ) {
    return 'band';
  }
  return 'free';
}

export function formatPrice(price: number, interval: BillingInterval): string {
  if (interval === 'yearly') {
    return `${price}€/an`;
  }
  return `${price}€/mois`;
}

export function getYearlySavings(plan: 'pro' | 'band'): number {
  const planConfig = PLANS[plan];
  if (!planConfig.monthly || !planConfig.yearly) return 0;
  const monthlyTotal = planConfig.monthly.price * 12;
  const yearlyPrice = planConfig.yearly.price;
  return monthlyTotal - yearlyPrice;
}
