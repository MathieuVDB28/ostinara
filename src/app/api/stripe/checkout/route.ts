import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { getPriceIdFromEnv, BillingInterval } from '@/lib/stripe/config';
import { UserPlan } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeServer();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { plan, interval } = await req.json() as { plan: UserPlan; interval: BillingInterval };

    if (!plan || !interval) {
      return NextResponse.json({ error: 'Plan et intervalle requis' }, { status: 400 });
    }

    const priceId = getPriceIdFromEnv(plan, interval);

    if (!priceId) {
      return NextResponse.json({ error: 'Configuration de prix manquante' }, { status: 400 });
    }

    // Récupérer ou créer le customer Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, plan, email:id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Créer un nouveau customer Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Sauvegarder le customer ID dans Supabase
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Si l'utilisateur a déjà un abonnement actif, on fait un changement de plan
    if (profile?.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Changer de plan avec prorata
          const currentPlan = profile.plan as 'free' | 'pro' | 'band';

          // Déterminer si c'est un upgrade ou downgrade
          const planOrder: Record<'free' | 'pro' | 'band', number> = { free: 0, pro: 1, band: 2 };
          const isDowngrade = planOrder[plan] < planOrder[currentPlan];

          await stripe.subscriptions.update(profile.stripe_subscription_id, {
            items: [{
              id: subscription.items.data[0].id,
              price: priceId,
            }],
            proration_behavior: isDowngrade ? 'always_invoice' : 'create_prorations',
          });

          return NextResponse.json({
            success: true,
            message: 'Abonnement mis à jour',
            action: 'updated'
          });
        }
      } catch {
        // L'abonnement n'existe plus ou est annulé, on continue avec une nouvelle session
        console.log('Existing subscription not found or canceled, creating new checkout session');
      }
    }

    // Créer une session Checkout pour un nouvel abonnement
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url, action: 'checkout' });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
