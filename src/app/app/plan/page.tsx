import { loadSession } from '@/lib/data';
import { resolveQuarter, quarterOptions } from '@/lib/quarter';
import { PlanForm } from '@/components/PlanForm';
import { QuarterPicker } from '@/components/QuarterPicker';
import { StagePill } from '@/components/Pill';
import { computeQuarter, DEFAULT_PLAN, todayISO, fmt, quarterLabel } from '@/lib/commission';

export const metadata = { title: 'Comp plan' };

export default async function PlanPage({ searchParams }: { searchParams: { q?: string } }) {
  const s = await loadSession();
  if (!s.plan)
    return (
      <main className="wrap page"><div className="narrow"><PlanForm initial={{ ...DEFAULT_PLAN, effective: todayISO() }} setup /></div></main>
    );
  const quarter = resolveQuarter(searchParams.q, s.ent);
  const k = computeQuarter(quarter, s.plan, s.deals);
  const list = [...k.won, ...k.clawed, ...k.open, ...k.lost];
  return (
    <main className="wrap page">
      <div className="pagehead">
        <div><h1>Comp plan</h1><p>Change any setting and every deal is recalculated. Use the breakdown to check the math deal by deal.</p></div>
        <div className="ctrls"><QuarterPicker value={quarter} options={quarterOptions(s.deals, quarter)} locked={s.ent.tier !== 'pro'} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 18, alignItems: 'start' }}>
        <PlanForm initial={s.plan} setup={false} />
        <section className="panel">
          <div className="panel-h"><h3>How each deal was calculated</h3><span className="hint">{quarterLabel(quarter)}, in close-date order</span></div>
          {list.length ? (
            <div className="howlist">
              {list.map((d) => {
                const c = k.calc[d.id];
                return (
                  <div className="how" key={d.id}>
                    <div style={{ minWidth: 0 }}><div className="co">{d.company} <StagePill stage={d.stage} /></div><div className="mono">{c.how}</div></div>
                    <div className="num" style={{ fontWeight: 600 }}>{d.stage === 'Closed Lost' ? '—' : fmt(c.comm)}{c.est && <span className="est"> est.</span>}</div>
                  </div>
                );
              })}
              <div className="how" style={{ background: 'var(--surface-2)' }}><div className="hint">Open deals are projected as if they close after your closed deals, in expected-close order. Renewals and clawed-back deals don’t count toward quota or tiers.</div></div>
            </div>
          ) : (
            <div className="empty"><p>No deals in {quarterLabel(quarter)} to break down yet.</p></div>
          )}
        </section>
      </div>
    </main>
  );
}
