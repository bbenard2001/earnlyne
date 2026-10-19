import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, siteUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

/** Opens Stripe's hosted billing portal: change plan, update card, cancel, download invoices. */
export async function POST() {
  const site = siteUrl();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`, 303);
  const { data: billing } = await supabase.from('billing').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!billing?.stripe_customer_id) return NextResponse.redirect(`${site}/pricing`, 303);
  const portal = await stripe().billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: `${site}/app/settings` });
  return NextResponse.redirect(portal.url, 303);
}
