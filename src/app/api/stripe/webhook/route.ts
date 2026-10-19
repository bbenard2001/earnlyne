import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe → earnlYne. The only place billing state is written.
 * Subscribe this endpoint in Stripe to: checkout.session.completed,
 * customer.subscription.created, customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    return new NextResponse(`Webhook signature check failed: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createAdminClient();

  async function userIdFor(customerId: string, metaUserId?: string | null) {
    if (metaUserId) return metaUserId;
    const { data } = await admin.from('billing').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    return data?.user_id as string | undefined;
  }

  async function syncSubscription(sub: Stripe.Subscription) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const userId = await userIdFor(customerId, sub.metadata?.userId);
    if (!userId) return;
    const { data: existing } = await admin.from('billing').select('lifetime').eq('user_id', userId).maybeSingle();
    await admin.from('billing').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: existing?.lifetime ? 'lifetime' : sub.status,
      price_id: sub.items.data[0]?.price.id ?? null,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
        const userId = s.client_reference_id || s.metadata?.userId;
        if (!customerId || !userId) break;
        if (s.mode === 'subscription' && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id);
          await syncSubscription(sub);
        } else if (s.mode === 'payment' && s.payment_status === 'paid') {
          // Lifetime purchase. Cancel any running subscription so they aren't billed twice.
          const { data: b } = await admin.from('billing').select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle();
          if (b?.stripe_subscription_id && b.status !== 'canceled') {
            try { await stripe().subscriptions.cancel(b.stripe_subscription_id); } catch { /* already gone */ }
          }
          await admin.from('billing').upsert({
            user_id: userId, stripe_customer_id: customerId, lifetime: true, status: 'lifetime', current_period_end: null,
            cancel_at_period_end: false, updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handling failed', event.type, err);
    return new NextResponse('Webhook handler error', { status: 500 }); // Stripe will retry
  }
  return NextResponse.json({ received: true });
}
