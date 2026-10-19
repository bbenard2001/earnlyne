'use client';
import { useState, useTransition } from 'react';
import { saveMoney } from '@/app/app/actions';
import { takeHome, futureValue, fmt, type MoneySettings } from '@/lib/commission';

const COLORS = ['var(--amber)', 'var(--indigo)', 'var(--teal)', 'var(--red)', 'var(--muted)'];

export function MoneyPlanner({ initial, grossQ, grossY, qLabel, year }: { initial: MoneySettings; grossQ: number; grossY: number; qLabel: string; year: string }) {
  const [m, setM] = useState<MoneySettings>(initial);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const set = (patch: Partial<MoneySettings>) => { setM({ ...m, ...patch }); setMsg(''); };
  const setPct = (i: number, v: number) => set({ buckets: m.buckets.map((b, j) => (j === i ? { ...b, pct: v } : b)) });
  const n = (s: string) => (Number.isFinite(parseFloat(s)) ? parseFloat(s) : 0);

  const q = takeHome(grossQ, m), y = takeHome(grossY, m);
  const total = m.buckets.reduce((s, b) => s + b.pct, 0);
  const investPct = m.buckets.filter((b) => b.invest).reduce((s, b) => s + b.pct, 0);
  const investQ = (q.net * investPct) / 100;
  const fv = futureValue(investQ, m.ret, m.years);
  const line = (l: string, a: number, b: number, neg = false) => (
    <div className="lrow"><span>{l}</span><span className={`num mono ${neg ? 'neg' : ''}`}>{fmt(neg ? -a : a)}</span><span className={`num mono ${neg ? 'neg' : ''}`}>{fmt(neg ? -b : b)}</span></div>
  );

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 18, alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-h"><h3>Commission after withholding</h3></div>
          <div style={{ padding: '6px 18px 16px' }}>
            <div className="lrow" style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}><span /><span className="num">{qLabel}</span><span className="num">{year} to date</span></div>
            {line('Commission earned', q.gross, y.gross)}
            {line(`Federal withholding (${m.fed}%)`, q.fed, y.fed, true)}
            {line(`State withholding (${m.state}%)`, q.st, y.st, true)}
            {line(`Social Security + Medicare (${m.fica}%)`, q.fica, y.fica, true)}
            <div className="lrow tot"><span>Estimated take-home</span><span className="num mono" style={{ color: 'var(--teal-ink)' }}>{fmt(q.net)}</span><span className="num mono">{fmt(y.net)}</span></div>
          </div>
          <div className="grow">
            <label className="f">Federal %<input type="number" min={0} max={60} step={0.1} value={m.fed} onChange={(e) => set({ fed: n(e.target.value) })} /></label>
            <label className="f">State %<input type="number" min={0} max={20} step={0.1} value={m.state} onChange={(e) => set({ state: n(e.target.value) })} /></label>
            <label className="f">SS + Medicare %<input type="number" min={0} max={20} step={0.01} value={m.fica} onChange={(e) => set({ fica: n(e.target.value) })} /></label>
          </div>
          <p className="hint" style={{ margin: 0, padding: '0 18px 16px' }}>
            US employers usually withhold commission at the 22% federal supplemental rate (37% above $1M in a year). Set your state’s rate; it starts at 0.
            Social Security stops once your year’s pay passes the wage cap. Pre-tax 401(k) contributions lower the taxable amount. This is a withholding estimate, not your tax bill.
          </p>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h3>Where the money goes</h3>
            <span className="hint" style={Math.abs(total - 100) > 0.01 ? { color: 'var(--red)', fontWeight: 600 } : undefined}>{Math.abs(total - 100) > 0.01 ? `Adds up to ${+total.toFixed(2)}%, adjust to 100%` : 'Adds up to 100%'}</span>
          </div>
          <div className="stack" aria-hidden="true" style={{ marginTop: 14 }}>
            {m.buckets.map((b, i) => <div key={b.key} style={{ width: `${total ? (b.pct / Math.max(total, 100)) * 100 : 0}%`, background: COLORS[i] }} />)}
          </div>
          <div className="bucket h"><span>Bucket</span><span className="num">Share %</span><span className="num">{qLabel}</span><span className="num ytd">{year} to date</span></div>
          {m.buckets.map((b, i) => (
            <div className="bucket" key={b.key}>
              <span><span className="swatch" style={{ background: COLORS[i] }} />{b.name}</span>
              <input type="number" min={0} max={100} step={5} value={b.pct} aria-label={`${b.name} percent`} onChange={(e) => setPct(i, n(e.target.value))} />
              <span className="num mono">{fmt((q.net * b.pct) / 100)}</span>
              <span className="num mono ytd">{fmt((y.net * b.pct) / 100)}</span>
            </div>
          ))}
          <div className="grow">
            <label className="f">Assumed yearly return %<input type="number" min={0} max={20} step={0.5} value={m.ret} onChange={(e) => set({ ret: n(e.target.value) })} /></label>
            <label className="f">Years<input type="number" min={1} max={50} step={1} value={m.years} onChange={(e) => set({ years: Math.max(1, Math.round(n(e.target.value))) })} /></label>
            <div className="res">
              If you invest this quarter’s retirement + brokerage share ({fmt(investQ)}) every quarter
              <strong>{fmt(fv)}</strong>after {m.years} years, from {fmt(investQ * Math.round(m.years * 4))} put in. An illustration at a fixed assumed return; real returns vary and can be negative.
            </div>
          </div>
        </section>
      </div>
      <div className="ctrls">
        <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await saveMoney(m); setMsg(r.error || 'Saved'); })}>{pending ? 'Saving…' : 'Save these settings'}</button>
        {msg && <span className={msg === 'Saved' ? 'ok' : 'err'} role="status">{msg}</span>}
      </div>
    </>
  );
}
