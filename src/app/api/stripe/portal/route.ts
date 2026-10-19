import { getLocale } from "next-intl/server";
import { tErr } from "@/i18n/server";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });
    }

    // Lisible par soi seul (profile_private, RLS)
    const { data: profile } = await supabase
      .from('profile_private')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: await tErr("noSubscription") },
        { status: 400 }
      );
    }

    // Créer une session Customer Portal
    const stripe = getStripeServer();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/subscription`,
      locale: await getLocale(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: await tErr("sessionCreateFailed") },
      { status: 500 }
    );
  }
}
