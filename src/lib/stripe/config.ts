import { UserPlan } from '@/types';
import type { Translator } from '@/i18n/types';

/** Descriptions et fonctionnalites : messages/<langue>/plans.json. */
export type PlansT = Translator<'plans'>;

export type PlanFeature =
  | 'metronomeNotebook' | 'basicStats' | 'challengesForum' | 'joinBands'
  | 'songs10' | 'instruments2' | 'covers3' | 'friends5' | 'wishlist20' | 'gear5'
  | 'unlimitedSongs' | 'unlimitedInstruments' | 'unlimitedCovers' | 'unlimitedFriends' | 'unlimitedWishlist' | 'unlimitedGear'
  | 'advancedStats' | 'deezerTabs' | 'audioRecognition' | 'albumRecommendations' | 'liveSessions' | 'proBadge'
  | 'fivePeople' | 'bandForAll' | 'everythingPro' | 'bandSpaces' | 'jamSessions' | 'rehearsals' | 'sharedSetlists' | 'bandChat' | 'techRider' | 'bandBadge';

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
    gear: number;
    gearSetups: number;
    gearWishlist: number;
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
      'metronomeNotebook',
      'basicStats',
      'challengesForum',
      'joinBands',
      'songs10',
      'instruments2',
      'covers3',
      'friends5',
      'wishlist20',
      'gear5',
    ],
    limits: {
      songs: 10,
      covers: 3,
      friends: 5,
      wishlist: 20,
      albumWishlist: 20,
      instruments: 2,
      gear: 5,
      gearSetups: 1,
      gearWishlist: 10,
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
      'unlimitedGear',
      'advancedStats',
      'deezerTabs',
      'audioRecognition',
      'albumRecommendations',
      'liveSessions',
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
      'fivePeople',
      'everythingPro',
      'bandSpaces',
      'bandForAll',
      'jamSessions',
      'rehearsals',
      'sharedSetlists',
      'bandChat',
      'techRider',
      'bandBadge',
    ],
    monthly: {
      price: 24,
    },
    yearly: {
      price: 230,
    },
  },
};

// Server-side only: get price ID from environment variables
export function getPriceIdFromEnv(plan: UserPlan, interval: BillingInterval): string | null {
  if (plan === 'free') return null;

  const priceIds: Record<string, string | undefined> = {
    'pro_monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
    'pro_yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
    // Le Band a 3 places. Sans ces variables, le paiement echoue plutot que de
    // facturer l'ancien prix en affichant le nouveau.
    'band_monthly': process.env.STRIPE_PRICE_BAND_SHARED_MONTHLY,
    'band_yearly': process.env.STRIPE_PRICE_BAND_SHARED_YEARLY,
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
  // Les anciens prix (19 et 182 EUR) restent reconnus : leurs abonnes gardent
  // leur tarif, et un prix inconnu les ferait retomber en Free.
  if (
    priceId === process.env.STRIPE_PRICE_BAND_SHARED_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_BAND_SHARED_YEARLY ||
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
