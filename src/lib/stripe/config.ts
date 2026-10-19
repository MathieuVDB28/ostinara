import { UserPlan } from '@/types';
import type { Translator } from '@/i18n/types';

/** Descriptions et fonctionnalites : messages/<langue>/plans.json. */
export type PlansT = Translator<'plans'>;

export type PlanFeature =
  | 'songs10' | 'instruments2' | 'covers3' | 'friends5' | 'wishlist20'
  | 'unlimitedSongs' | 'unlimitedInstruments' | 'unlimitedCovers' | 'unlimitedFriends' | 'unlimitedWishlist'
  | 'advancedStats' | 'deezerTabs' | 'audioRecognition' | 'proBadge'
  | 'everythingPro' | 'bandSpaces' | 'sharedSetlists' | 'bandBadge';

export type BillingInterval = 'monthly' | 'yearly';

export interface PlanConfig {
  name: string;
  /** Cles de plans.features. La description : plans.description.<plan>. */
  features: PlanFeature[];
  limits?: {
    songs: number;
    covers: number;
    friends: number;
    wishlist: number;
    albumWishlist: number;
    instruments: number;
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
    features: [
      'songs10',
      'instruments2',
      'covers3',
      'friends5',
      'wishlist20',
    ],
    limits: {
      songs: 10,
      covers: 3,
      friends: 5,
      wishlist: 20,
      albumWishlist: 20,
      instruments: 2,
    },
  },
  pro: {
    name: 'Pro',
    features: [
      'unlimitedSongs',
      'unlimitedInstruments',
      'unlimitedCovers',
      'unlimitedFriends',
      'unlimitedWishlist',
      'advancedStats',
      'deezerTabs',
      'audioRecognition',
      'proBadge',
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
    features: [
      'everythingPro',
      'deezerTabs',
      'audioRecognition',
      'bandSpaces',
      'sharedSetlists',
      'bandBadge',
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

export function formatPrice(price: number, interval: BillingInterval, t: PlansT): string {
  return interval === 'yearly' ? t('pricePerYear', { price }) : t('pricePerMonth', { price });
}

export function getYearlySavings(plan: 'pro' | 'band'): number {
  const planConfig = PLANS[plan];
  if (!planConfig.monthly || !planConfig.yearly) return 0;
  const monthlyTotal = planConfig.monthly.price * 12;
  const yearlyPrice = planConfig.yearly.price;
  return monthlyTotal - yearlyPrice;
}
