import { currentQuarter, quarterOf, type Deal } from '@/lib/commission';
import type { Entitlement } from '@/lib/billing';

/** Which quarter a page shows. Free users always see the current quarter. */
export function resolveQuarter(q: string | undefined, ent: Entitlement) {
  const cur = currentQuarter();
  if (ent.tier !== 'pro') return cur;
  return q && /^\d{4}-Q[1-4]$/.test(q) ? q : cur;
}
export function quarterOptions(deals: Deal[], selected: string) {
  const set = new Set(deals.map((d) => quarterOf(d.closeDate)).filter(Boolean) as string[]);
  set.add(currentQuarter());
  set.add(selected);
  return [...set].sort().reverse();
}
