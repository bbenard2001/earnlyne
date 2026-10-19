import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { resolveQuarter, quarterOptions } from '@/lib/quarter';
import { QuarterPicker } from '@/components/QuarterPicker';
import { ProGate } from '@/components/ProGate';
import { PayRow } from '@/components/PayRow';
import { Pill } from '@/components/Pill';
import { computeQuarter, fmt, quarterLabel } from '@/lib/commission';

export const metadata = { title: 'Pay check' };

export default async function PayCheck({ searchParams }: { searchParams: { q?: string } }) {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  if (s.ent.tier !== 'pro')
    return (
      <main className="wrap page">
        <ProGate title="Check every payout against your own math">
          <p className="muted" style={{ margin: 0 }}>Type what your pay stub shows and earnlYne flags anything short, overpaid or clawed back.</p>
        </ProGate>
      </main>
    );
  const p = s.plan, quarter = resolveQuarter(searchParams.q, s.ent), k = computeQuarter(quarter, p, s.deals);
  const rows = [...k.won, ...k.clawed];
  return (
    <main className="wrap page">
      <div className="pagehead">
        <div><h1>Pay check</h1><p>Type what your pay stub shows for each closed deal. earnlYne compares it with what your plan says should have been paid so far: {p.upfrontPct}% on signature, the rest once the customer pays.</p></div>
        <div className="ctrls"><QuarterPicker value={quarter} options={quarterOptions(s.deals, quarter)} locked={false} /></div>
      </div>
      <div className="kpis">
        <div className="kpi"><div className="l">Should be paid by now</div><div className="v">{fmt(k.dueNow)}</div><div className="s">of {fmt(k.earned)} earned</div></div>
        <div className="kpi"><div className="l">Paid per pay stubs</div><div className="v">{fmt(k.paid)}</div><div className="s">what you entered</div></div>
        <div className={`kpi ${k.owedNow > 0.5 ? '' : 'hl'}`} style={k.owedNow > 0.5 ? { background: 'var(--red-tint)', borderColor: 'transparent' } : undefined}>
          <div className="l">Owed to you now</div><div className="v" style={k.owedNow > 0.5 ? { color: 'var(--red)' } : undefined}>{fmt(k.owedNow)}</div><div className="s">{k.owedNow > 0.5 ? 'raise this with payroll' : 'nothing missing'}</div>
        </div>
        {k.repay > 0.5 ? (
          <div className="kpi" style={{ background: 'var(--red-tint)', borderColor: 'transparent' }}><div className="l">Clawbacks to repay</div><div className="v" style={{ color: 'var(--red)' }}>{fmt(k.repay)}</div><div className="s">cancelled inside the window</div></div>
        ) : (
          <div className="kpi"><div className="l">Due when customers pay</div><div className="v">{fmt(k.toCome)}</div><div className="s">not late yet</div></div>
        )}
      </div>
      <section className="panel">
        <div className="panel-h"><h3>Closed deals · {quarterLabel(quarter)}</h3><span className="hint">Changes save when you leave a field</span></div>
        {rows.length ? (
          <div className="tscroll">
            <table>
              <thead><tr><th>Deal</th><th className="r">Commission</th><th>Customer paid?</th><th className="r">Due now</th><th className="r">Paid (pay stub)</th><th>Result</th></tr></thead>
              <tbody>{rows.map((d) => <PayRow key={d.id} id={d.id} company={d.company} calc={k.calc[d.id]} collected={d.collected} paid={d.paid} upfrontPct={p.upfrontPct} />)}</tbody>
              <tfoot><tr><td>Total</td><td className="r num">{fmt(k.earned)}</td><td /><td className="r num">{fmt(k.dueNow)}</td><td className="r num">{fmt(k.paid)}</td>
                <td>{k.owedNow > 0.5 ? <Pill tone="bad">Owed {fmt(k.owedNow)}</Pill> : k.repay > 0.5 ? <Pill tone="bad">Repay {fmt(k.repay)}</Pill> : <Pill tone="ok">Matches</Pill>}</td></tr></tfoot>
            </table>
          </div>
        ) : (
          <div className="empty"><h3>No closed deals in {quarterLabel(quarter)}</h3><p>Mark a deal Closed Won and it will show up here to check against your pay stub.</p></div>
        )}
      </section>
      <p className="note">This comparison is a starting point for a conversation with your manager or payroll contact. It is not an official payroll record or proof for a formal dispute.</p>
    </main>
  );
}
