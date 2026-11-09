/** Deal import: CSV parsing and row validation. Pure, so it is unit-tested. */
import { STAGES, type Stage, type DealType } from '@/lib/commission';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const ALIASES: Record<string, string[]> = {
  company: ['company', 'account', 'account name', 'customer', 'deal', 'deal name', 'name'],
  value: ['value', 'deal value', 'amount', 'acv', 'deal amount'],
  stage: ['stage', 'deal stage', 'status'],
  type: ['type', 'deal type'],
  close_date: ['close date', 'closedate', 'close', 'date', 'expected close', 'expected close date'],
  partner: ['partner', 'channel partner'],
  collected: ['customer paid', 'collected', 'customer paid?', 'invoice paid'],
  paid: ['paid to you', 'paid', 'commission paid', 'amount paid'],
};

export interface ImportRow {
  company: string; value: number; stage: Stage; deal_type: DealType; close_date: string;
  partner: string | null; collected: boolean; paid: number;
}

const yes = (v: string) => /^(y|yes|true|1|x|paid)$/i.test(v.trim());
const money = (v: string) => { const n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : NaN; };

export function parseDate(v: string): string | null {
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // US M/D/YYYY, how Excel saves CSV in the US
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  return null;
}
function iso(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}
function stageOf(v: string): Stage | null {
  const t = v.trim().toLowerCase();
  if (t === 'won' || t === 'closed won' || t === 'closed-won') return 'Closed Won';
  if (t === 'lost' || t === 'closed lost' || t === 'closed-lost') return 'Closed Lost';
  return STAGES.find((s) => s.toLowerCase() === t) ?? null;
}
function typeOf(v: string): DealType | null {
  const t = v.trim().toLowerCase();
  if (!t || t === 'new' || t === 'new business') return 'new';
  if (t === 'upsell' || t === 'expansion') return 'upsell';
  if (t === 'renewal') return 'renewal';
  return null;
}

export function rowsFromCsv(text: string): { rows: { line: number; row: ImportRow }[]; errors: { line: number; reason: string }[]; missing: string[] } {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], errors: [], missing: ['company', 'value', 'stage', 'close date'] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(ALIASES)) {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) col[k] = i;
  }
  const missing = ['company', 'value', 'stage', 'close_date'].filter((k) => col[k] === undefined).map((k) => k.replace('_', ' '));
  if (missing.length) return { rows: [], errors: [], missing };

  const rows: { line: number; row: ImportRow }[] = [];
  const errors: { line: number; reason: string }[] = [];
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const get = (k: string) => (col[k] === undefined ? '' : (r[col[k]] ?? '').trim());
    const company = get('company');
    const value = money(get('value'));
    const stage = stageOf(get('stage'));
    const type = typeOf(get('type'));
    const date = parseDate(get('close_date'));
    if (!company) return errors.push({ line, reason: 'missing company' });
    if (!(value > 0)) return errors.push({ line, reason: `value “${get('value')}” isn’t a number above 0` });
    if (!stage) return errors.push({ line, reason: `stage “${get('stage')}” isn’t one of ${STAGES.join(', ')}` });
    if (!type) return errors.push({ line, reason: `type “${get('type')}” should be New, Upsell or Renewal` });
    if (!date) return errors.push({ line, reason: `close date “${get('close_date')}” should look like 2026-11-15 or 11/15/2026` });
    const won = stage === 'Closed Won';
    const paid = money(get('paid'));
    rows.push({ line, row: {
      company: company.slice(0, 200), value, stage, deal_type: type, close_date: date, partner: get('partner') || null,
      collected: won && yes(get('collected')), paid: won && paid > 0 ? paid : 0,
    } });
  });
  return { rows, errors, missing: [] };
}
