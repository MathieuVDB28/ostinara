import Stripe from 'stripe';

// Lazy initialization to avoid errors during build when env vars aren't available
let stripeInstance: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export for backward compatibility - will be called at runtime
export const stripe = {
  get customers() { return getStripeServer().customers; },
  get subscriptions() { return getStripeServer().subscriptions; },
  get checkout() { return getStripeServer().checkout; },
  get billingPortal() { return getStripeServer().billingPortal; },
  get webhooks() { return getStripeServer().webhooks; },
};
