import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { FREE_FEATURES, PRO_FEATURES, PRICING, type PriceKey } from '@/lib/billing';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pricing' };

export default async function Pricing({ searchParams }: { searchParams: { canceled?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const buy = (key: PriceKey, label: string, featured = false) =>
    user ? (
      <form action="/api/stripe/checkout" method="post">
        <input type="hidden" name="price" value={key} />
        <button className={`btn ${featured ? 'teal' : ''}`} style={{ width: '100%' }} type="submit">{label}</button>
      </form>
    ) : (
      <Link className={`btn ${featured ? 'teal' : ''}`} style={{ width: '100%' }} href={`/signup?plan=${key}`}>{label}</Link>
    );

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <div className="pagehead">
          <div>
            <h1>Simple pricing</h1>
            <p>Start free with the current quarter. Upgrade when you want your full history, pay checks and the take-home planner. Cancel anytime.</p>
          </div>
        </div>
        {searchParams.canceled && <p className="note">Checkout was canceled. You haven’t been charged.</p>}
        <div className="price-grid">
          <div className="panel price">
            <h3>Free</h3>
            <div className="amt">$0</div>
            <ul>{FREE_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link className="btn ghost" href={user ? '/app' : '/signup'}>{user ? 'Go to dashboard' : 'Start free'}</Link>
          </div>
          <div className="panel price featured">
            <h3>{PRICING.monthly.label}</h3>
            <div className="amt">${PRICING.monthly.amount}<small> {PRICING.monthly.cadence}</small></div>
            <ul>{PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
            {buy('monthly', 'Get Pro monthly', true)}
          </div>
          <div className="panel price">
            <h3>{PRICING.annual.label}</h3>
            <div className="amt">${PRICING.annual.amount}<small> {PRICING.annual.cadence}</small></div>
            <ul><li>Everything in Pro</li><li>{PRICING.annual.note}</li></ul>
            {buy('annual', 'Get Pro annual')}
          </div>
          <div className="panel price">
            <h3>{PRICING.lifetime.label}</h3>
            <div className="amt">${PRICING.lifetime.amount}<small> one time</small></div>
            <ul><li>Everything in Pro, forever</li><li>No subscription to manage</li></ul>
            {buy('lifetime', 'Buy lifetime')}
          </div>
        </div>
        <p className="hint">Prices in USD. Payments are processed securely by Stripe; earnlYne never sees your card number.</p>
      </main>
      <SiteFooter />
    </>
  );
}
