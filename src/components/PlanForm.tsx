'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePlan } from '@/app/app/actions';
import { tierTable, rateReached, marginal, quotaPayout, validatePlan, fmt, type CompPlan } from '@/lib/commission';

export function PlanForm({ initial, setup }: { initial: CompPlan; setup: boolean }) {
  const [p, setP] = useState<CompPlan>(initial);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (patch: Partial<CompPlan>) => { setP({ ...p, ...patch }); setMsg({}); };
  const n = (s: string) => (Number.isFinite(parseFloat(s)) ? parseFloat(s) : 0);
  const unit = p.tierBasis === 'quota' ? '% of quota' : '$ closed';

  const setTier = (i: number, patch: Partial<CompPlan['tiers'][number]>) => set({ tiers: p.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const addTier = () => {
    const last = p.tiers[p.tiers.length - 1];
    set({ tiers: [...p.tiers, last ? { at: p.tierBasis === 'quota' ? last.at + 30 : last.at + 50000, rate: last.rate + 3 } : { at: p.tierBasis === 'quota' ? 100 : p.quota, rate: p.baseRate + 3 }] });
  };
  const changeBasis = (basis: CompPlan['tierBasis']) => {
    if (basis === p.tierBasis) return;
    set({ tierBasis: basis, tiers: p.tiers.map((t) => ({ rate: t.rate, at: basis === 'quota' ? Math.round((t.at / p.quota) * 100) : Math.round((p.quota * t.at) / 100) })) });
  };

  // live preview
  const tbl = tierTable(p);
  const ex = Math.round(Math.max(p.quota * 1.6, tbl[tbl.length - 1].at * 1.25, 100000) / 5000) * 5000;
  const r = p.retro ? { comm: (ex * rateReached(tbl, ex).rate) / 100, how: `${fmt(ex)} × ${rateReached(tbl, ex).rate}% (whole quarter)` } : marginal(tbl, 0, ex);
  const atQuota = quotaPayout(p);
  const oteQ = p.ote > p.baseSalary ? (p.ote - p.baseSalary) / 4 : 0;
  const mismatch = oteQ > 0 && Math.abs(atQuota - oteQ) / oteQ > 0.05;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePlan(p);
    if (err) return setMsg({ err });
    start(async () => {
      const res = await savePlan(p);
      if (res.error) return setMsg({ err: res.error });
      if (setup) router.push('/app');
      else { setMsg({ ok: 'Plan saved. Every deal has been recalculated.' }); router.refresh(); }
    });
  };

  return (
    <form className="panel card" onSubmit={submit} noValidate>
      <div>
        {setup && <div className="testpill" style={{ display: 'inline-block', marginBottom: 8 }}>Step 2 of 2</div>}
        <h1>{setup ? 'Describe your comp plan' : 'Edit comp plan'}</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>This is your plan, not a deal. Saving creates a new version; earlier versions are kept.</p>
      </div>
      <label className="f">Plan name<input type="text" value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>

      <div className="lbl">Pay</div>
      <div className="fgrid">
        <label className="f">Annual base salary ($)<input type="number" min={0} step={1000} value={p.baseSalary || ''} placeholder="90000" onChange={(e) => set({ baseSalary: n(e.target.value) })} /></label>
        <label className="f">Annual OTE ($)<span className="hint">Base plus commission at 100% of quota</span><input type="number" min={0} step={1000} value={p.ote || ''} placeholder="138000" onChange={(e) => set({ ote: n(e.target.value) })} /></label>
      </div>

      <div className="lbl">Quota and rates</div>
      <div className="fgrid">
        <label className="f">Quarterly quota ($)<input type="number" min={0} step={1000} value={p.quota} onChange={(e) => set({ quota: n(e.target.value) })} /></label>
        <label className="f">Base commission rate (%)<input type="number" min={0} max={100} step={0.1} value={p.baseRate} onChange={(e) => set({ baseRate: n(e.target.value) })} /></label>
      </div>
      <div className="fgrid">
        <label className="f">Tiers are set by
          <select value={p.tierBasis} onChange={(e) => changeBasis(e.target.value as CompPlan['tierBasis'])}>
            <option value="dollars">Dollars closed in the quarter</option><option value="quota">Percent of quota</option>
          </select>
        </label>
        <label className="f">Higher rate applies to
          <select value={p.retro ? '1' : '0'} onChange={(e) => set({ retro: e.target.value === '1' })}>
            <option value="0">Only the amount above it</option><option value="1">The whole quarter (retroactive)</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="tierbase">From <strong>{p.tierBasis === 'quota' ? '0%' : '$0'}</strong>: base rate</div>
        {p.tiers.map((t, i) => (
          <div className="tierrow" key={i}>
            <span>From</span>
            <input type="number" min={0} step={p.tierBasis === 'quota' ? 1 : 1000} value={t.at} aria-label={`Tier ${i + 1} starts at`} onChange={(e) => setTier(i, { at: n(e.target.value) })} />
            <span>{unit}</span><span>pay</span>
            <input type="number" min={0} max={100} step={0.1} value={t.rate} aria-label={`Tier ${i + 1} rate`} onChange={(e) => setTier(i, { rate: n(e.target.value) })} />
            <span>%</span>
            <button type="button" className="x" aria-label={`Remove tier ${i + 1}`} onClick={() => set({ tiers: p.tiers.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <div><button type="button" className="btn sm ghost" onClick={addTier}>+ Add tier</button></div>
      </div>

      <div className="lbl">Payouts</div>
      <div className="fgrid">
        <label className="f">Paid on signature (%)<span className="hint">The rest is paid when the customer pays</span><input type="number" min={0} max={100} step={5} value={p.upfrontPct} onChange={(e) => set({ upfrontPct: n(e.target.value) })} /></label>
        <label className="f">Renewal rate (%)<span className="hint">Renewals don’t count toward quota</span><input type="number" min={0} max={100} step={0.1} value={p.renewalRate} onChange={(e) => set({ renewalRate: n(e.target.value) })} /></label>
        <label className="f">Clawback window (days)<span className="hint">0 = no clawback</span><input type="number" min={0} step={1} value={p.clawbackDays} onChange={(e) => set({ clawbackDays: Math.max(0, Math.round(n(e.target.value))) })} /></label>
      </div>
      <label className="f">Effective from<input type="date" value={p.effective} onChange={(e) => set({ effective: e.target.value })} /></label>

      <div className="preview">
        <div className="hint">Example: a quarter where you close {fmt(ex)}</div>
        <div className="big">{fmt(r.comm)}</div>
        <div className="hint mono">{r.how}</div>
        <div className="hint" style={{ marginTop: 8 }}>
          At exactly 100% of quota this plan pays <strong>{fmt(atQuota)}</strong> a quarter{oteQ ? <>. Your OTE implies <strong>{fmt(oteQ)}</strong> a quarter ((OTE − base) ÷ 4).</> : '.'}
        </div>
        {mismatch && <div className="warnbox" style={{ marginTop: 8 }}>These don’t match. Check your quota, rates or OTE against your signed plan.</div>}
      </div>
      {msg.err && <p className="err" role="alert" style={{ margin: 0 }}>{msg.err}</p>}
      {msg.ok && <p className="ok" role="status" style={{ margin: 0 }}>{msg.ok}</p>}
      <div className="sheet-f"><span /><button className="btn" type="submit" disabled={pending}>{pending ? 'Saving…' : setup ? 'Go to my dashboard' : 'Save plan'}</button></div>
    </form>
  );
}
