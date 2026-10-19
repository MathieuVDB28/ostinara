import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPlanFromPriceId } from '@/lib/stripe/config';

// Lazy initialization for supabase admin client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdminInstance: SupabaseClient<any, any, any> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdminInstance;
}

/**
 * Le compte d'un client Stripe. Le lien vit dans profile_private (lisible
 * par son seul proprietaire) : on le lit avec le service role.
 */
async function findProfileByCustomer(customerId: string): Promise<{ id: string } | null> {
  const { data } = await getSupabaseAdmin()
    .from('profile_private')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data ? { id: data.user_id as string } : null;
}

/**
 * Enregistre l'etat d'un abonnement : le plan sur profiles (public, il
 * donne le badge Pro / Band), le reste sur profile_private. `plan` null :
 * inchange.
 */
async function writeSubscription(
  userId: string,
  plan: string | null,
  details: {
    stripe_subscription_id?: string | null;
    subscription_status?: string;
    subscription_period_end?: string | null;
  }
): Promise<{ error: unknown }> {
  const admin = getSupabaseAdmin();
  const [privateResult, planResult] = await Promise.all([
    admin.from('profile_private').upsert({ user_id: userId, ...details }, { onConflict: 'user_id' }),
    plan ? admin.from('profiles').update({ plan }).eq('id', userId) : Promise.resolve({ error: null }),
  ]);
  return { error: privateResult.error ?? planResult.error };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] No signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripeServer();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', errorMessage);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;

  if (!userId) {
    console.error('[Stripe Webhook] No user ID in checkout session metadata');
    return;
  }

  if (session.mode !== 'subscription' || !session.subscription) {
    console.log('[Stripe Webhook] Not a subscription checkout');
    return;
  }

  const subscription = await getStripeServer().subscriptions.retrieve(session.subscription as string);
  await updateUserSubscription(userId, subscription);

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    // Essayer de trouver l'utilisateur via le customer ID
    const profile = await findProfileByCustomer(subscription.customer as string);

    if (!profile) {
      console.error('[Stripe Webhook] Could not find user for subscription');
      return;
    }

    await updateUserSubscription(profile.id, subscription);
    console.log(`[Stripe Webhook] Subscription updated for user ${profile.id}`);
    return;
  }

  await updateUserSubscription(userId, subscription);
  console.log(`[Stripe Webhook] Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  let targetUserId = userId;

  if (!targetUserId) {
    const profile = await findProfileByCustomer(subscription.customer as string);

    if (!profile) {
      console.error('[Stripe Webhook] Could not find user for deleted subscription');
      return;
    }
    targetUserId = profile.id;
  }

  // Réinitialiser au plan free
  const { error } = await writeSubscription(targetUserId, 'free', {
    subscription_status: 'canceled',
    stripe_subscription_id: null,
    subscription_period_end: null,
  });

  if (error) {
    console.error('[Stripe Webhook] Error resetting user to free plan:', error);
    return;
  }

  console.log(`[Stripe Webhook] Subscription deleted, user ${targetUserId} reset to free`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
  if (!subscriptionId) return;

  const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    const profile = await findProfileByCustomer(invoice.customer as string);

    if (profile) {
      await writeSubscription(profile.id, null, { subscription_status: 'active' });
    }
    return;
  }

  await writeSubscription(userId, null, { subscription_status: 'active' });

  console.log(`[Stripe Webhook] Payment succeeded for user ${userId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const profile = await findProfileByCustomer(customerId);

  if (!profile) {
    console.error('[Stripe Webhook] Could not find user for failed payment');
    return;
  }

  await writeSubscription(profile.id, null, { subscription_status: 'past_due' });

  console.log(`[Stripe Webhook] Payment failed for user ${profile.id}`);
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('[Stripe Webhook] No price ID in subscription');
    return;
  }

  const plan = getPlanFromPriceId(priceId);
  // Cast to access current_period_end which exists on subscription but TypeScript doesn't recognize
  const subData = subscription as unknown as { current_period_end: number };
  const periodEnd = new Date(subData.current_period_end * 1000).toISOString();

  const { error } = await writeSubscription(userId, plan, {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_period_end: periodEnd,
  });

  if (error) {
    console.error('[Stripe Webhook] Error updating user subscription:', error);
    throw error;
  }
}
