'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { planToRow, type DealRow } from '@/lib/data';
import { STAGES, DEAL_TYPES, validatePlan, currentQuarter, quarterOf, fmt, fmtDate, type CompPlan, type MoneySettings } from '@/lib/commission';
import { entitlementFromBilling } from '@/lib/billing';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}
async function isPro(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('billing').select('*').eq('user_id', userId).maybeSingle();
  return entitlementFromBilling(data).tier === 'pro';
}
const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export type ActionResult = { error?: string; ok?: boolean };

/* ---------- comp plan: saving creates a new active version; old versions are kept ---------- */
export async function savePlan(plan: CompPlan): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const err = validatePlan(plan);
  if (err) return { error: err };
  const { error: e1 } = await supabase.from('comp_plans').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true);
  if (e1) return { error: 'Couldn’t save the plan. Please try again.' };
  const { error } = await supabase.from('comp_plans').insert({ ...planToRow(plan), user_id: user.id, is_active: true });
  if (error) return { error: 'Couldn’t save the plan. Please try again.' };
  revalidatePath('/app', 'layout');
  return { ok: true };
}

/* ---------- deals ---------- */
const LABELS: Record<string, string> = {
  company: 'Company', value: 'Value', stage: 'Stage', deal_type: 'Type', close_date: 'Close date', partner: 'Partner',
  collected: 'Customer paid', paid: 'Paid to you', cancelled: 'Cancelled', cancel_date: 'Cancel date',
};
function show(field: string, v: unknown) {
  if (field === 'value' || field === 'paid') return fmt(Number(v) || 0);
  if (field === 'collected' || field === 'cancelled') return v ? 'Yes' : 'No';
  if (field === 'close_date' || field === 'cancel_date') return v ? fmtDate(String(v)) : '—';
  return v ? String(v) : '—';
}
async function logChanges(supabase: ReturnType<typeof createClient>, userId: string, before: Partial<DealRow>, after: Record<string, unknown>, dealId: string) {
  const rows = Object.keys(LABELS)
    .filter((f) => f in after && String((before as Record<string, unknown>)[f] ?? '') !== String(after[f] ?? ''))
    .filter((f) => !(f === 'cancel_date' && !(before as Record<string, unknown>)[f] && !after[f]))
    .map((f) => ({ deal_id: dealId, user_id: userId, field: LABELS[f], old_value: show(f, (before as Record<string, unknown>)[f]), new_value: show(f, after[f]) }));
  if (rows.length) await supabase.from('deal_edit_history').insert(rows);
}

export async function saveDeal(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const id = String(form.get('id') || '');
  const stage = String(form.get('stage') || '') as (typeof STAGES)[number];
  const type = String(form.get('type') || 'new');
  const won = stage === 'Closed Won';
  const row = {
    company: String(form.get('company') || '').trim(),
    value: num(form.get('value')),
    stage,
    deal_type: type,
    close_date: String(form.get('close_date') || ''),
    partner: String(form.get('partner') || '').trim() || null,
    collected: won && form.get('collected') === 'on',
    paid: won ? num(form.get('paid')) : 0,
    cancelled: won && form.get('cancelled') === 'on',
    cancel_date: won && form.get('cancelled') === 'on' ? String(form.get('cancel_date') || '') || null : null,
  };
  if (!row.company) return { error: 'Enter a company name.' };
  if (!(row.value > 0)) return { error: 'Enter a deal value above $0.' };
  if (!STAGES.includes(stage)) return { error: 'Pick a stage.' };
  if (!DEAL_TYPES.some(([k]) => k === type)) return { error: 'Pick a deal type.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.close_date)) return { error: 'Pick a close date (or an expected one for an open deal).' };
  if (row.cancelled && !row.cancel_date) return { error: 'Add the date the customer cancelled.' };
  if (row.cancel_date && row.cancel_date < row.close_date) return { error: 'The cancel date can’t be before the close date.' };
  if (!(await isPro(supabase, user.id)) && quarterOf(row.close_date) !== currentQuarter())
    return { error: 'The Free plan covers the current quarter. Upgrade to Pro to log deals in other quarters.' };

  if (id) {
    const { data: before } = await supabase.from('deals').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (!before) return { error: 'That deal no longer exists.' };
    const { error } = await supabase.from('deals').update(row).eq('id', id).eq('user_id', user.id);
    if (error) return { error: 'Couldn’t save the deal. Please try again.' };
    await logChanges(supabase, user.id, before, row, id);
  } else {
    const { error } = await supabase.from('deals').insert({ ...row, user_id: user.id });
    if (error) return { error: 'Couldn’t save the deal. Please try again.' };
  }
  revalidatePath('/app', 'layout');
  redirect(`/app?q=${quarterOf(row.close_date)}`);
}

export async function deleteDeal(form: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(form.get('id') || '');
  await supabase.from('deals').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/app', 'layout');
  redirect('/app');
}

/** Pay check edits: amount paid and whether the customer has paid. */
export async function updatePayout(id: string, patch: { paid?: number; collected?: boolean }): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!(await isPro(supabase, user.id))) return { error: 'Pay check is a Pro feature.' };
  const { data: before } = await supabase.from('deals').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!before) return { error: 'That deal no longer exists.' };
  const update: Record<string, unknown> = {};
  if (patch.paid !== undefined && Number.isFinite(patch.paid) && patch.paid >= 0) update.paid = patch.paid;
  if (patch.collected !== undefined) update.collected = patch.collected;
  if (!Object.keys(update).length) return { ok: true };
  const { error } = await supabase.from('deals').update(update).eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'Couldn’t save. Please try again.' };
  await logChanges(supabase, user.id, before, update, id);
  revalidatePath('/app', 'layout');
  return { ok: true };
}

/* ---------- take-home settings ---------- */
export async function saveMoney(m: MoneySettings): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const clean: MoneySettings = {
    fed: Math.max(0, Math.min(60, m.fed)), state: Math.max(0, Math.min(20, m.state)), fica: Math.max(0, Math.min(20, m.fica)),
    ret: Math.max(0, Math.min(20, m.ret)), years: Math.max(1, Math.min(50, Math.round(m.years))),
    buckets: m.buckets.map((b) => ({ ...b, pct: Math.max(0, Math.min(100, b.pct)) })),
  };
  const { error } = await supabase.from('profiles').update({ money: clean }).eq('id', user.id);
  if (error) return { error: 'Couldn’t save your settings.' };
  revalidatePath('/app/take-home');
  return { ok: true };
}

/* ---------- account ---------- */
export async function updateName(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const name = String(form.get('name') || '').trim();
  if (!name) return { error: 'Enter your name.' };
  const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
  if (error) return { error: 'Couldn’t save your name.' };
  revalidatePath('/app', 'layout');
  return { ok: true };
}

/** Deletes the account and every record. Cancels any Stripe subscription first. */
export async function deleteAccount(form: FormData) {
  const { supabase, user } = await requireUser();
  if (form.get('confirm') !== 'DELETE') redirect('/app/settings?delete=confirm');
  const { data: billing } = await supabase.from('billing').select('stripe_subscription_id, status').eq('user_id', user.id).maybeSingle();
  if (billing?.stripe_subscription_id && billing.status !== 'canceled') {
    try {
      await stripe().subscriptions.cancel(billing.stripe_subscription_id);
    } catch {
      /* already canceled or Stripe unavailable; continue */
    }
  }
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id); // cascades to every table
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}
