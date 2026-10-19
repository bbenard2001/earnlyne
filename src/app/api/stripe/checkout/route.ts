import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, siteUrl } from '@/lib/stripe';
import { PRICING, entitlementFromBilling, type PriceKey } from '@/lib/billing';

export const runtime = 'nodejs';

/** Starts a Stripe Checkout for the chosen plan. Called by the pricing page's buy buttons (form POST). */
export async function POST(request: Request) {
  const form = await request.formData();
  const key = String(form.get('price') || '') as PriceKey;
  const site = siteUrl();
  if (!(key in PRICING)) return NextResponse.redirect(`${site}/pricing`, 303);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/signup?plan=${key}`, 303);

  const priceId = process.env[PRICING[key].env];
  if (!priceId) return new NextResponse(`Missing ${PRICING[key].env} environment variable`, { status: 500 });

  const admin = createAdminClient();
  const { data: billing } = await admin.from('billing').select('*').eq('user_id', user.id).maybeSingle();
  const ent = entitlementFromBilling(billing);
  if (ent.lifetime) return NextResponse.redirect(`${site}/app/settings`, 303);

  // Already subscribed and picking another subscription: let them switch plans in the Stripe portal instead of paying twice.
  if (ent.tier === 'pro' && PRICING[key].mode === 'subscription' && billing?.stripe_customer_id) {
    const portal = await stripe().billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: `${site}/app/settings` });
    return NextResponse.redirect(portal.url, 303);
  }

  let customerId = billing?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await admin.from('billing').upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
  }

  const session = await stripe().checkout.sessions.create({
    mode: PRICING[key].mode,
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { userId: user.id, plan: key },
    ...(PRICING[key].mode === 'subscription'
      ? { subscription_data: { metadata: { userId: user.id } } }
      : { payment_intent_data: { metadata: { userId: user.id, plan: key } } }),
    success_url: `${site}/app/settings?checkout=success`,
    cancel_url: `${site}/pricing?canceled=1`,
  });
  return NextResponse.redirect(session.url!, 303);
}
