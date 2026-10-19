import { describe, expect, it } from 'vitest';
import { entitlementFromBilling } from './billing';

const base = { status: null, lifetime: false, current_period_end: null, cancel_at_period_end: false, stripe_customer_id: null };
describe('entitlements', () => {
  it('no billing row is free', () => expect(entitlementFromBilling(null).tier).toBe('free'));
  it('active subscription is pro', () =>
    expect(entitlementFromBilling({ ...base, status: 'active', current_period_end: new Date(Date.now() + 864e5).toISOString() }).tier).toBe('pro'));
  it('canceled subscription is free', () => expect(entitlementFromBilling({ ...base, status: 'canceled' }).tier).toBe('free'));
  it('expired period is free even if status lags', () =>
    expect(entitlementFromBilling({ ...base, status: 'active', current_period_end: new Date(Date.now() - 10 * 864e5).toISOString() }).tier).toBe('free'));
  it('lifetime is pro', () => expect(entitlementFromBilling({ ...base, lifetime: true }).tier).toBe('pro'));
});
