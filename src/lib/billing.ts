/** What a user can use. Pure so it can be tested and shared. */

export type Tier = 'free' | 'pro';
export interface Entitlement {
  tier: Tier;
  status: string | null; // Stripe status, or 'lifetime'
  lifetime: boolean;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
}

type BillingRow = {
  status: string | null;
  lifetime: boolean | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string | null;
} | null;

const ACTIVE = new Set(['active', 'trialing', 'past_due']); // past_due keeps access while Stripe retries the card

export function entitlementFromBilling(b: BillingRow, now = Date.now()): Entitlement {
  const lifetime = !!b?.lifetime;
  const periodOk = !b?.current_period_end || Date.parse(b.current_period_end) > now - 3 * 864e5; // 3-day grace
  const pro = lifetime || (!!b?.status && ACTIVE.has(b.status) && periodOk);
  return {
    tier: pro ? 'pro' : 'free',
    status: lifetime ? 'lifetime' : b?.status ?? null,
    lifetime,
    renewsAt: b?.current_period_end ?? null,
    cancelAtPeriodEnd: !!b?.cancel_at_period_end,
    hasCustomer: !!b?.stripe_customer_id,
  };
}

/** The pricing shown on the site. Amounts must match the Prices you create in Stripe. */
export const PRICING = {
  monthly: { label: 'Pro monthly', amount: 11, cadence: '/month', env: 'STRIPE_PRICE_MONTHLY', mode: 'subscription' as const },
  annual: { label: 'Pro annual', amount: 89, cadence: '/year', env: 'STRIPE_PRICE_ANNUAL', mode: 'subscription' as const, note: 'about $7.42/month, 2+ months free' },
  lifetime: { label: 'Lifetime', amount: 179, cadence: 'once', env: 'STRIPE_PRICE_LIFETIME', mode: 'payment' as const },
};
export type PriceKey = keyof typeof PRICING;

export const FREE_FEATURES = ['Current quarter dashboard', 'Unlimited deals this quarter', 'Comp plan with tiers, renewals and clawbacks'];
export const PRO_FEATURES = [
  'Every quarter and full history',
  'Pay check: compare every payout to your pay stub',
  'Take-home and reinvesting planner',
  'Total pay against OTE, year to date',
  'CSV export of all your deals',
];
