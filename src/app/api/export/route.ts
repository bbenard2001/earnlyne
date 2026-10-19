import { NextResponse } from 'next/server';
import { loadSession } from '@/lib/data';
import { computeQuarter, quarterOf, DEAL_TYPES } from '@/lib/commission';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of every deal with the commission earnlYne calculated for it. Pro only. */
export async function GET() {
  const s = await loadSession();
  if (s.ent.tier !== 'pro') return new NextResponse('CSV export is a Pro feature.', { status: 403 });
  const quarters = [...new Set(s.deals.map((d) => quarterOf(d.closeDate)).filter(Boolean) as string[])];
  const calc = Object.assign({}, ...quarters.map((q) => (s.plan ? computeQuarter(q, s.plan, s.deals).calc : {})));
  const header = ['Company', 'Value', 'Stage', 'Type', 'Close date', 'Quarter', 'Partner', 'Commission', 'Estimate', 'Due now', 'Paid to you', 'Customer paid', 'Cancelled', 'Cancel date', 'How calculated'];
  const lines = s.deals.map((d) => {
    const c = calc[d.id] || {};
    return [d.company, d.value, d.stage, DEAL_TYPES.find((t) => t[0] === d.type)?.[1], d.closeDate, quarterOf(d.closeDate), d.partner, (c.comm ?? 0).toFixed(2),
      c.est ? 'yes' : '', c.due !== undefined ? c.due.toFixed(2) : '', d.paid, d.collected ? 'yes' : 'no', d.cancelled ? 'yes' : 'no', d.cancelDate || '', c.how || ''].map(cell).join(',');
  });
  const csv = [header.join(','), ...lines, '', cell('Personal reference only — not an official payroll record.')].join('\n');
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="earnlyne-deals-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
