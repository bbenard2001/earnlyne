/**
 * earnlYne commission engine.
 *
 * Pure functions, no I/O, so the same math runs on the server, in the
 * browser and in tests. Every figure the app shows comes from here.
 */

export const STAGES = ['Prospecting', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: Stage[] = ['Prospecting', 'Proposal', 'Negotiation'];
export const DEAL_TYPES = [
  ['new', 'New business'],
  ['upsell', 'Upsell'],
  ['renewal', 'Renewal'],
] as const;
export type DealType = (typeof DEAL_TYPES)[number][0];

export interface Tier {
  /** Where the tier starts: dollars closed in the quarter, or percent of quota (see tierBasis). */
  at: number;
  /** Commission rate in percent, e.g. 11 for 11%. */
  rate: number;
}

export interface CompPlan {
  name: string;
  quota: number; // per quarter
  baseRate: number; // percent
  tiers: Tier[];
  tierBasis: 'dollars' | 'quota';
  retro: boolean; // true = reaching a tier raises the rate on the whole quarter
  upfrontPct: number; // percent paid on signature; the rest on collection
  renewalRate: number; // percent; renewals don't count toward quota or tiers
  clawbackDays: number; // 0 = no clawback
  baseSalary: number; // annual
  ote: number; // annual on-target earnings
  effective: string; // YYYY-MM-DD
}

export interface Deal {
  id: string;
  company: string;
  value: number;
  stage: Stage;
  type: DealType;
  closeDate: string; // actual for closed deals, expected for open ones (YYYY-MM-DD)
  partner?: string;
  collected: boolean; // customer has paid the invoice
  paid: number; // commission received so far, per pay stubs
  cancelled: boolean;
  cancelDate?: string | null;
  createdAt: number; // ms, tie-breaker for same-day deals
}

export interface DealCalc {
  comm: number;
  how: string;
  est?: boolean;
  crossed?: boolean;
  clawed?: boolean;
  due?: number;
  paid?: number;
  diff?: number;
}

export const DEFAULT_PLAN: CompPlan = {
  name: 'My comp plan',
  quota: 150000,
  baseRate: 8,
  tiers: [{ at: 200000, rate: 11 }],
  tierBasis: 'dollars',
  retro: false,
  upfrontPct: 50,
  renewalRate: 4,
  clawbackDays: 90,
  baseSalary: 0,
  ote: 0,
  effective: new Date().toISOString().slice(0, 10),
};

/* ---------- formatting & dates ---------- */

export const fmt = (n: number) => (n < -0.5 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
export const fmtK = (n: number) =>
  Math.abs(n) >= 1e6 ? '$' + +(n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1000 ? '$' + +(n / 1000).toFixed(1) + 'k' : fmt(n);
export const pctStr = (x: number) => Math.round(x * 100) + '%';

export function quarterOf(date?: string | null): string | null {
  if (!date) return null;
  const [y, m] = date.split('-').map(Number);
  if (!y || !m) return null;
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}
export const quarterLabel = (q: string) => {
  const [y, qq] = q.split('-');
  return `${qq} ${y}`;
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const currentQuarter = () => quarterOf(todayISO())!;
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
}
export function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/* ---------- tiers ---------- */

interface TierRow {
  at: number; // in dollars
  rate: number;
}

export function tierTable(p: CompPlan): TierRow[] {
  const bps = (p.tiers || [])
    .map((t) => ({ at: p.tierBasis === 'quota' ? (p.quota * t.at) / 100 : t.at, rate: t.rate }))
    .filter((t) => t.at > 0 && Number.isFinite(t.at))
    .sort((a, b) => a.at - b.at);
  return [{ at: 0, rate: p.baseRate }, ...bps];
}

export function rateReached(tbl: TierRow[], x: number): TierRow {
  let r = tbl[0];
  for (const t of tbl) if (t.at > 0 && x >= t.at) r = t;
  return r;
}

/** Commission on `v` dollars that start at cumulative position `from`, paying each slice at its tier rate. */
export function marginal(tbl: TierRow[], from: number, v: number) {
  let comm = 0;
  const parts: string[] = [];
  const end = from + v;
  for (let i = 0; i < tbl.length; i++) {
    const lo = tbl[i].at;
    const hi = i + 1 < tbl.length ? tbl[i + 1].at : Infinity;
    const a = Math.max(lo, from);
    const b = Math.min(hi, end);
    if (b > a) {
      comm += ((b - a) * tbl[i].rate) / 100;
      parts.push(`${fmt(b - a)} × ${tbl[i].rate}%`);
    }
  }
  return { comm, how: parts.join(' + ') || '$0', crossed: parts.length > 1 };
}

export function isClawedBack(d: Deal, p: CompPlan) {
  return (
    d.stage === 'Closed Won' &&
    d.cancelled &&
    !!d.cancelDate &&
    p.clawbackDays > 0 &&
    daysBetween(d.closeDate, d.cancelDate) <= p.clawbackDays
  );
}

/** Commission paid at exactly 100% of quarterly quota. */
export function quotaPayout(p: CompPlan) {
  const tbl = tierTable(p);
  return p.retro ? (p.quota * rateReached(tbl, p.quota).rate) / 100 : marginal(tbl, 0, p.quota).comm;
}

/* ---------- the quarter ---------- */

export interface QuarterResult {
  rows: Deal[];
  calc: Record<string, DealCalc>;
  won: Deal[];
  lost: Deal[];
  open: Deal[];
  clawed: Deal[];
  closedValue: number;
  earned: number;
  dueNow: number;
  paid: number;
  owedNow: number;
  repay: number;
  projected: number;
  toCome: number;
  attainment: number;
  winRate: number | null;
  avgDeal: number | null;
  tiers: TierRow[];
}

export function computeQuarter(q: string, p: CompPlan, deals: Deal[]): QuarterResult {
  const tbl = tierTable(p);
  const up = p.upfrontPct / 100;
  const inQ = deals.filter((d) => quarterOf(d.closeDate) === q);
  const byDate = (a: Deal, b: Deal) => (a.closeDate || '').localeCompare(b.closeDate || '') || a.createdAt - b.createdAt;
  const clawed = inQ.filter((d) => isClawedBack(d, p)).sort(byDate);
  const won = inQ.filter((d) => d.stage === 'Closed Won' && !isClawedBack(d, p)).sort(byDate);
  const lost = inQ.filter((d) => d.stage === 'Closed Lost');
  const open = inQ.filter((d) => OPEN_STAGES.includes(d.stage)).sort(byDate);
  const calc: Record<string, DealCalc> = {};
  const renewal = (v: number): DealCalc => ({ comm: (v * p.renewalRate) / 100, how: `${fmt(v)} × ${p.renewalRate}% renewal rate` });

  const wonNew = won.filter((d) => d.type !== 'renewal');
  const closedValue = wonNew.reduce((s, d) => s + d.value, 0);

  if (p.retro) {
    const r = rateReached(tbl, closedValue);
    for (const d of wonNew)
      calc[d.id] = {
        comm: (d.value * r.rate) / 100,
        how: `${fmt(d.value)} × ${r.rate}%` + (r.at > 0 ? ` (retroactive: quarter passed ${fmtK(r.at)})` : ''),
      };
  } else {
    let cum = 0;
    for (const d of wonNew) {
      calc[d.id] = marginal(tbl, cum, d.value);
      cum += d.value;
    }
  }
  for (const d of won) if (d.type === 'renewal') calc[d.id] = renewal(d.value);

  // Open deals are projected as if they close after the closed ones, in expected-close order.
  let cum = closedValue;
  for (const d of open) {
    if (d.type === 'renewal') {
      calc[d.id] = { ...renewal(d.value), est: true };
      continue;
    }
    if (p.retro) {
      const rOld = rateReached(tbl, cum).rate;
      const rNew = rateReached(tbl, cum + d.value).rate;
      const lift = ((rNew - rOld) / 100) * cum;
      calc[d.id] = {
        comm: (d.value * rNew) / 100 + lift,
        how: `${fmt(d.value)} × ${rNew}%` + (lift > 0.5 ? ` + ${fmt(lift)} lift on earlier deals` : ''),
        est: true,
      };
    } else calc[d.id] = { ...marginal(tbl, cum, d.value), est: true };
    cum += d.value;
  }
  for (const d of lost) calc[d.id] = { comm: 0, how: 'Lost, no commission' };
  for (const d of clawed)
    calc[d.id] = {
      comm: 0,
      clawed: true,
      how: `Cancelled ${daysBetween(d.closeDate, d.cancelDate!)} days after close, inside the ${p.clawbackDays}-day window: clawed back`,
    };
  for (const d of won) if (d.cancelled && d.cancelDate) calc[d.id].how += ` · cancelled after the ${p.clawbackDays}-day window, commission kept`;

  let earned = 0, dueNow = 0, paid = 0, owedNow = 0, repay = 0, projected = 0;
  for (const d of won) {
    const c = calc[d.id];
    c.due = d.collected ? c.comm : c.comm * up;
    c.paid = d.paid || 0;
    c.diff = c.due - c.paid;
    earned += c.comm;
    dueNow += c.due;
    paid += c.paid;
    owedNow += Math.max(0, c.diff);
  }
  for (const d of clawed) {
    const c = calc[d.id];
    c.due = 0;
    c.paid = d.paid || 0;
    c.diff = -c.paid;
    paid += c.paid;
    repay += c.paid;
  }
  for (const d of open) projected += calc[d.id].comm;
  const decided = won.length + lost.length;

  return {
    rows: inQ.slice().sort(byDate),
    calc, won, lost, open, clawed, closedValue, earned, dueNow, paid, owedNow, repay, projected,
    toCome: earned - dueNow,
    attainment: p.quota ? closedValue / p.quota : 0,
    winRate: decided ? won.length / decided : null,
    avgDeal: won.length ? won.reduce((s, d) => s + d.value, 0) / won.length : null,
    tiers: tbl,
  };
}

export function yearEarned(year: string, p: CompPlan, deals: Deal[]) {
  let s = 0;
  for (let i = 1; i <= 4; i++) s += computeQuarter(`${year}-Q${i}`, p, deals).earned;
  return s;
}

export function payStatus(c: DealCalc): { tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; label: string } {
  const due = c.due ?? 0, paid = c.paid ?? 0, diff = c.diff ?? 0;
  if (c.clawed) return paid > 0.5 ? { tone: 'bad', label: 'Repay ' + fmt(paid) } : { tone: 'muted', label: 'Clawed back' };
  if (due < 0.5) return { tone: 'muted', label: 'Nothing due' };
  if (paid < 0.5) return { tone: 'warn', label: 'Not paid yet' };
  if (diff > 0.5) return { tone: 'bad', label: 'Short ' + fmt(diff) };
  if (diff < -0.5) return { tone: 'info', label: 'Over ' + fmt(-diff) };
  return { tone: 'ok', label: 'Matches' };
}

export function planSummary(p: CompPlan) {
  const t = [...(p.tiers || [])].sort((a, b) => a.at - b.at);
  const where = (x: number) => (p.tierBasis === 'quota' ? `${x}% of quota` : `${fmtK(x)} a quarter`);
  const rates = t.length ? `${p.baseRate}% of value, ` + t.map((x) => `${x.rate}% from ${where(x.at)}`).join(', ') + (p.retro ? ' (retroactive)' : '') : `${p.baseRate}% of value`;
  return `${rates}. ${p.upfrontPct}% paid on signature, the rest when the customer pays.${p.clawbackDays ? ` ${p.clawbackDays}-day clawback.` : ''}`;
}

export function validatePlan(p: CompPlan): string | null {
  if (!(p.quota > 0)) return 'Enter a quarterly quota above $0.';
  if (!(p.baseRate >= 0 && p.baseRate <= 100)) return 'Base rate must be between 0% and 100%.';
  if (p.tiers.some((t) => !(t.at > 0))) return 'Each tier needs a starting point above 0, or remove it.';
  if (p.tiers.some((t) => !(t.rate >= 0 && t.rate <= 100))) return 'Tier rates must be between 0% and 100%.';
  if (!(p.upfrontPct >= 0 && p.upfrontPct <= 100)) return 'Paid on signature must be between 0% and 100%.';
  if (p.clawbackDays < 0) return 'Clawback window can’t be negative.';
  if (p.ote && p.ote < p.baseSalary) return 'OTE should be at least your base salary.';
  return null;
}

/* ---------- take-home & reinvesting ---------- */

export interface MoneySettings {
  fed: number;
  state: number;
  fica: number;
  ret: number;
  years: number;
  buckets: { key: string; name: string; pct: number; invest?: boolean }[];
}

export const DEFAULT_MONEY: MoneySettings = {
  fed: 22,
  state: 0,
  fica: 7.65,
  ret: 6,
  years: 10,
  buckets: [
    { key: 'emergency', name: 'Emergency fund', pct: 20 },
    { key: 'retire', name: 'Retirement (401k / IRA)', pct: 30, invest: true },
    { key: 'invest', name: 'Brokerage investing', pct: 30, invest: true },
    { key: 'debt', name: 'Pay down debt', pct: 0 },
    { key: 'spend', name: 'Spend', pct: 20 },
  ],
};

export function takeHome(gross: number, m: MoneySettings) {
  const fed = (gross * m.fed) / 100;
  const st = (gross * m.state) / 100;
  const fica = (gross * m.fica) / 100;
  return { gross, fed, st, fica, net: gross - fed - st - fica };
}

export function futureValue(perQuarter: number, annualPct: number, years: number) {
  const r = annualPct / 100 / 4;
  const n = Math.round(years * 4);
  if (n <= 0) return 0;
  return r === 0 ? perQuarter * n : perQuarter * ((Math.pow(1 + r, n) - 1) / r);
}
