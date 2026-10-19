import { describe, expect, it } from 'vitest';
import { computeQuarter, yearEarned, takeHome, futureValue, quotaPayout, DEFAULT_MONEY, type CompPlan, type Deal } from './commission';

// The fictional Jordan Rivera sample used across the mockups and the test site.
const plan: CompPlan = {
  name: '2026 Core AE Plan', quota: 150000, baseRate: 8, tiers: [{ at: 200000, rate: 11 }], tierBasis: 'dollars', retro: false,
  upfrontPct: 50, renewalRate: 4, clawbackDays: 90, baseSalary: 90000, ote: 138000, effective: '2026-01-01',
};
let n = 0;
const deal = (company: string, value: number, stage: Deal['stage'], closeDate: string, o: Partial<Deal> = {}): Deal => ({
  id: company + n, company, value, stage, type: 'new', closeDate, collected: false, paid: 0, cancelled: false, cancelDate: null, createdAt: n++, ...o,
});
const sample = () => [
  deal('Ashford A', 42000, 'Closed Won', '2026-02-10', { collected: true, paid: 3360 }),
  deal('Ashford B', 36000, 'Closed Won', '2026-03-18', { collected: true, paid: 2880 }),
  deal('Solmark', 87000, 'Closed Won', '2026-04-30', { paid: 3480 }),
  deal('Fenwick', 118000, 'Closed Won', '2026-05-14', { collected: true, paid: 9590 }),
  deal('Halvorsen', 52000, 'Closed Lost', '2026-05-28'),
  deal('Northbridge', 64000, 'Negotiation', '2026-06-24'),
  deal('Corvid', 31500, 'Proposal', '2026-06-30'),
];
const Q = '2026-Q2';
const byName = (k: ReturnType<typeof computeQuarter>, ds: Deal[], name: string) => k.calc[ds.find((d) => d.company === name)!.id];

describe('commission engine — test guide scenarios', () => {
  it('t1 sample numbers', () => {
    const ds = sample(), k = computeQuarter(Q, plan, ds);
    expect(Math.round(k.attainment * 100)).toBe(137);
    expect(k.earned).toBeCloseTo(16550);
    expect(Math.round(k.winRate! * 100)).toBe(67);
    expect(k.avgDeal).toBe(102500);
    expect(k.paid).toBe(13070);
    expect(k.toCome).toBeCloseTo(3480);
    expect(k.projected).toBeCloseTo(10505);
  });
  it('t2 deal past the tier earns 11%', () => {
    const ds = [...sample(), deal('X', 50000, 'Closed Won', '2026-06-01')], k = computeQuarter(Q, plan, ds);
    expect(byName(k, ds, 'X').comm).toBeCloseTo(5500);
    expect(k.earned).toBeCloseTo(22050);
  });
  it('t3 close date order matters', () => {
    const ds = [...sample(), deal('X', 50000, 'Closed Won', '2026-04-15')], k = computeQuarter(Q, plan, ds);
    expect(byName(k, ds, 'X').comm).toBeCloseTo(4000);
    expect(byName(k, ds, 'Fenwick').comm).toBeCloseTo(11090);
    expect(k.earned).toBeCloseTo(22050);
  });
  it('t4 short payout', () => {
    const ds = sample(); ds.find((d) => d.company === 'Fenwick')!.paid = 9000;
    expect(computeQuarter(Q, plan, ds).owedNow).toBeCloseTo(590);
  });
  it('t5 collection releases the backend', () => {
    const ds = sample(); ds.find((d) => d.company === 'Solmark')!.collected = true;
    const k = computeQuarter(Q, plan, ds);
    expect(byName(k, ds, 'Solmark').due).toBeCloseTo(6960);
    expect(k.owedNow).toBeCloseTo(3480);
  });
  it('t6 renewals', () => {
    const ds = [...sample(), deal('R', 40000, 'Closed Won', '2026-05-05', { type: 'renewal' })], k = computeQuarter(Q, plan, ds);
    expect(byName(k, ds, 'R').comm).toBeCloseTo(1600);
    expect(Math.round(k.attainment * 100)).toBe(137);
  });
  it('t7 lost deal', () => {
    const ds = sample(); ds.find((d) => d.company === 'Northbridge')!.stage = 'Closed Lost';
    const k = computeQuarter(Q, plan, ds);
    expect(k.projected).toBeCloseTo(3465);
    expect(k.winRate).toBe(0.5);
  });
  it('t8 no tier', () => {
    expect(computeQuarter(Q, { ...plan, tiers: [] }, sample()).earned).toBeCloseTo(16400);
  });
  it('t11 pay vs OTE', () => {
    const k = computeQuarter(Q, plan, sample());
    expect(plan.baseSalary / 4 + k.earned).toBeCloseTo(39050);
    expect(yearEarned('2026', plan, sample())).toBeCloseTo(22790);
    expect(quotaPayout(plan)).toBeCloseTo((plan.ote - plan.baseSalary) / 4);
  });
  it('t12 clawback inside window', () => {
    const ds = sample(); Object.assign(ds.find((d) => d.company === 'Solmark')!, { cancelled: true, cancelDate: '2026-06-20' });
    const k = computeQuarter(Q, plan, ds);
    expect(k.earned).toBeCloseTo(9440);
    expect(Math.round(k.attainment * 100)).toBe(79);
    expect(k.repay).toBe(3480);
  });
  it('t13 cancellation after window keeps commission', () => {
    const ds = sample(); Object.assign(ds.find((d) => d.company === 'Solmark')!, { cancelled: true, cancelDate: '2026-09-15' });
    expect(computeQuarter(Q, plan, ds).earned).toBeCloseTo(16550);
  });
  it('t14 tier as percent of quota', () => {
    const p = { ...plan, tierBasis: 'quota' as const, tiers: [{ at: 100, rate: 11 }] }, ds = sample();
    const k = computeQuarter(Q, p, ds);
    expect(byName(k, ds, 'Fenwick').comm).toBeCloseTo(11090);
    expect(k.earned).toBeCloseTo(18050);
  });
  it('t15 several tiers', () => {
    const p = { ...plan, tierBasis: 'quota' as const, tiers: [{ at: 100, rate: 11 }, { at: 130, rate: 14 }] }, ds = sample();
    const k = computeQuarter(Q, p, ds);
    expect(byName(k, ds, 'Fenwick').comm).toBeCloseTo(11390);
    expect(k.earned).toBeCloseTo(18350);
  });
  it('t16 retroactive accelerator', () => {
    const ds = sample(), k = computeQuarter(Q, { ...plan, retro: true }, ds);
    expect(byName(k, ds, 'Solmark').comm).toBeCloseTo(9570);
    expect(byName(k, ds, 'Fenwick').comm).toBeCloseTo(12980);
    expect(k.earned).toBeCloseTo(22550);
  });
  it('t17 take-home', () => {
    expect(Math.round(takeHome(16550, DEFAULT_MONEY).net)).toBe(11643);
    expect(Math.round(takeHome(16550, { ...DEFAULT_MONEY, state: 9.3 }).net)).toBe(10104);
  });
  it('growth illustration', () => {
    expect(futureValue(1000, 0, 2)).toBe(8000);
    expect(Math.round(futureValue(6985.76, 6, 10))).toBeGreaterThan(379000);
  });
});
