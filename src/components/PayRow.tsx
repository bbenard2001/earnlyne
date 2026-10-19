'use client';
import { useState, useTransition } from 'react';
import { updatePayout } from '@/app/app/actions';
import { payStatus, fmt, type DealCalc } from '@/lib/commission';
import { Pill } from './Pill';

export function PayRow({ id, company, calc, collected, paid, upfrontPct }: { id: string; company: string; calc: DealCalc; collected: boolean; paid: number; upfrontPct: number }) {
  const [value, setValue] = useState(paid ? String(Math.round(paid * 100) / 100) : '');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const typed = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  const live = payStatus({ ...calc, paid: typed, diff: (calc.due ?? 0) - typed });
  const save = (patch: { paid?: number; collected?: boolean }) =>
    start(async () => {
      const r = await updatePayout(id, patch);
      setErr(r.error || '');
    });
  return (
    <tr>
      <td><div className="co">{company}</div><div className="sub mono">{calc.how}</div>{err && <div className="err">{err}</div>}</td>
      <td className="r num">{fmt(calc.comm)}</td>
      <td>
        {calc.clawed ? <span className="muted">Cancelled</span> : (
          <label className="check" style={{ color: 'var(--ink)' }}>
            <input type="checkbox" defaultChecked={collected} disabled={pending} onChange={(e) => save({ collected: e.target.checked })} /> {collected ? 'Yes' : 'Not yet'}
          </label>
        )}
      </td>
      <td className="r num">{fmt(calc.due ?? 0)}<div className="est">{calc.clawed ? 'clawed back' : collected ? '100%' : `${upfrontPct}% on signature`}</div></td>
      <td className="r">
        <input className="paidin" type="text" inputMode="decimal" value={value} placeholder="$0" aria-label={`Amount paid for ${company}`}
          onChange={(e) => setValue(e.target.value)} onBlur={() => typed !== paid && save({ paid: typed })} />
      </td>
      <td><Pill tone={live.tone}>{live.label}</Pill>{pending && <span className="est"> saving…</span>}</td>
    </tr>
  );
}
