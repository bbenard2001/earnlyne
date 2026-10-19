import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_MONEY, type CompPlan, type Deal, type MoneySettings } from '@/lib/commission';
import { entitlementFromBilling, type Entitlement } from '@/lib/billing';

/* Row ↔ engine mapping. The database is snake_case; the engine is camelCase. */

export type PlanRow = {
  id: string; name: string; quota: number; base_rate: number; tiers: { at: number; rate: number }[]; tier_basis: 'dollars' | 'quota';
  retro: boolean; upfront_pct: number; renewal_rate: number; clawback_days: number; base_salary: number; ote: number; effective_date: string;
};
export type DealRow = {
  id: string; company: string; value: number; stage: Deal['stage']; deal_type: Deal['type']; close_date: string; partner: string | null;
  collected: boolean; paid: number; cancelled: boolean; cancel_date: string | null; created_at: string;
};

export const planFromRow = (r: PlanRow): CompPlan => ({
  name: r.name, quota: Number(r.quota), baseRate: Number(r.base_rate),
  tiers: (r.tiers || []).map((t) => ({ at: Number(t.at), rate: Number(t.rate) })), tierBasis: r.tier_basis, retro: r.retro,
  upfrontPct: Number(r.upfront_pct), renewalRate: Number(r.renewal_rate), clawbackDays: Number(r.clawback_days),
  baseSalary: Number(r.base_salary), ote: Number(r.ote), effective: r.effective_date,
});
export const planToRow = (p: CompPlan) => ({
  name: p.name, quota: p.quota, base_rate: p.baseRate, tiers: p.tiers, tier_basis: p.tierBasis, retro: p.retro,
  upfront_pct: p.upfrontPct, renewal_rate: p.renewalRate, clawback_days: p.clawbackDays, base_salary: p.baseSalary, ote: p.ote,
  effective_date: p.effective,
});
export const dealFromRow = (r: DealRow): Deal => ({
  id: r.id, company: r.company, value: Number(r.value), stage: r.stage, type: r.deal_type, closeDate: r.close_date,
  partner: r.partner || '', collected: r.collected, paid: Number(r.paid), cancelled: r.cancelled, cancelDate: r.cancel_date,
  createdAt: Date.parse(r.created_at),
});

export interface Session {
  userId: string;
  email: string;
  name: string;
  plan: CompPlan | null;
  deals: Deal[];
  money: MoneySettings;
  ent: Entitlement;
}

/** Loads everything the app screens need for the signed-in user. Redirects to /login when signed out. */
export async function loadSession(): Promise<Session> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profile, plan, deals, billing] = await Promise.all([
    supabase.from('profiles').select('full_name, money').eq('id', user.id).maybeSingle(),
    supabase.from('comp_plans').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('deals').select('*').eq('user_id', user.id).order('close_date'),
    supabase.from('billing').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const money = { ...DEFAULT_MONEY, ...((profile.data?.money as Partial<MoneySettings>) || {}) };
  if (!Array.isArray(money.buckets) || money.buckets.length !== DEFAULT_MONEY.buckets.length) money.buckets = DEFAULT_MONEY.buckets;

  return {
    userId: user.id,
    email: user.email || '',
    name: profile.data?.full_name || (user.user_metadata?.full_name as string) || user.email || 'there',
    plan: plan.data ? planFromRow(plan.data as PlanRow) : null,
    deals: ((deals.data || []) as DealRow[]).map(dealFromRow),
    money,
    ent: entitlementFromBilling(billing.data),
  };
}
