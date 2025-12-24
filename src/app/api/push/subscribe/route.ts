import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[Push Subscribe] POST request received');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[Push Subscribe] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    console.log('[Push Subscribe] Subscription data received');

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      console.log('[Push Subscribe] Invalid subscription data');
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      console.log('[Push Subscribe] Updating existing subscription...');
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          keys: subscription.keys,
          user_agent: req.headers.get('user-agent') || undefined,
        })
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('[Push Subscribe] Error updating subscription:', error);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Subscription updated', subscriptionId: existing.id });
    }

    // Create new subscription
    console.log('[Push Subscribe] Creating new subscription...');
    const { data: newSubscription, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: req.headers.get('user-agent') || undefined,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Push Subscribe] Error creating subscription:', error);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    console.log('[Push Subscribe] Subscription created successfully');
    return NextResponse.json({ message: 'Subscription created', subscriptionId: newSubscription.id });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Push Subscribe] Error deleting subscription:', error);
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscription deleted' });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
