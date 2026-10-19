import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { resolveQuarter, quarterOptions } from '@/lib/quarter';
import { QuarterPicker } from '@/components/QuarterPicker';
import { Pill, StagePill } from '@/components/Pill';
import {
  computeQuarter, yearEarned, payStatus, planSummary, fmt, fmtK, fmtDate, pctStr, quarterLabel, OPEN_STAGES, DEAL_TYPES,
  type QuarterResult, type CompPlan,
} from '@/lib/commission';

export const metadata = { title: 'Dashboard' };

function PayPanel({ k, plan, quarter, deals, isPro }: { k: QuarterResult; plan: CompPlan; quarter: string; deals: Parameters<typeof yearEarned>[2]; isPro: boolean }) {
  if (!(plan.ote > 0 && plan.ote >= plan.baseSalary))
    return (
      <div className="panel" style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="muted">Add your base salary and OTE to see total pay and how you’re tracking against OTE.</span>
        <Link className="btn sm ghost" href="/app/plan">Add base and OTE</Link>
      </div>
    );
  const qBase = plan.baseSalary / 4, qVar = (plan.ote - plan.baseSalary) / 4, qOte = plan.ote / 4, total = qBase + k.earned;
  const year = quarter.split('-')[0], annVar = plan.ote - plan.baseSalary, ytd = yearEarned(year, plan, deals);
  return (
    <section className="panel pay">
      <div>
        <div className="lbl">Your pay · {quarterLabel(quarter)}</div>
        <div className="payeq" style={{ marginTop: 8 }}>
          <span>{fmt(qBase)}</span><span className="op">base +</span><span>{fmt(k.earned)}</span><span className="op">commission =</span><span className="big">{fmt(total)}</span>
        </div>
        <div className="minibar"><div style={{ width: `${Math.min(100, (total / qOte) * 100)}%` }} /></div>
        <div className="hint">{pctStr(total / qOte)} of quarterly OTE ({fmt(qOte)}) · commission at {qVar ? pctStr(k.earned / qVar) : '—'} of its {fmt(qVar)} target</div>
      </div>
      <div>
        <div className="lbl">Commission year to date · {year}</div>
        {isPro ? (
          <>
            <div className="payeq" style={{ marginTop: 8 }}><span className="big" style={{ color: 'var(--ink)' }}>{fmt(ytd)}</span><span className="op">of {fmt(annVar)} variable target</span></div>
            <div className="minibar"><div style={{ width: `${annVar ? Math.min(100, (ytd / annVar) * 100) : 0}%`, background: 'var(--indigo)' }} /></div>
            <div className="hint">{annVar ? pctStr(ytd / annVar) : '—'} of the year’s target · OTE {fmt(plan.ote)} = {fmt(plan.baseSalary)} base + {fmt(annVar)} variable</div>
          </>
        ) : (
          <p className="hint" style={{ marginTop: 10 }}>Year-to-date tracking against OTE is part of <Link href="/pricing">Pro</Link>.</p>
        )}
      </div>
    </section>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: { q?: string } }) {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  const p = s.plan, isPro = s.ent.tier === 'pro';
  const quarter = resolveQuarter(searchParams.q, s.ent);
  const k = computeQuarter(quarter, p, s.deals);
  const first = s.name.split(/\s+/)[0];

  const tiers = k.tiers.slice(1);
  const scale = Math.max(p.quota * 1.5, (tiers.length ? tiers[tiers.length - 1].at : 0) * 1.15, k.closedValue * 1.05) || 1;
  const w = (v: number) => Math.min(100, (v / scale) * 100);
  const marks = [{ v: p.quota, l: `Quota ${fmtK(p.quota)}`, tier: false }, ...tiers.map((t) => ({ v: t.at, l: `${t.rate}% from ${fmtK(t.at)}`, tier: true }))].sort((a, b) => a.v - b.v);
  let lastX = -99, alt = false;
  const placed = marks.map((m) => {
    const x = w(m.v);
    const row2 = x - lastX < 18 ? !alt : false;
    alt = row2; lastX = x;
    return { ...m, x, row2 };
  });
  const anyRow2 = placed.some((m) => m.row2);
  const nextTier = tiers.find((t) => t.at > k.closedValue);

  return (
    <main className="wrap page">
      <div className="pagehead">
        <div>
          <h1>Hi, {first}</h1>
          <p>{p.name}: {planSummary(p)}</p>
        </div>
        <div className="ctrls">
          <QuarterPicker value={quarter} options={quarterOptions(s.deals, quarter)} locked={!isPro} />
          <Link className="btn" href={`/app/deals/new?q=${quarter}`}>+ Add deal</Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Quota attainment</div><div className="v">{Math.round(k.attainment * 100)}%</div><div className="s">{fmt(k.closedValue)} closed of {fmtK(p.quota)}</div></div>
        <div className="kpi hl"><div className="l">Commission earned</div><div className="v">{fmt(k.earned)}</div><div className="s">{k.won.length} closed-won deal{k.won.length === 1 ? '' : 's'}{k.clawed.length ? ` · ${k.clawed.length} clawed back` : ''}</div></div>
        <div className="kpi"><div className="l">Win rate</div><div className="v">{k.winRate === null ? '—' : Math.round(k.winRate * 100) + '%'}</div><div className="s">{k.won.length} won · {k.lost.length} lost</div></div>
        <div className="kpi"><div className="l">Avg deal size</div><div className="v">{k.avgDeal === null ? '—' : fmtK(k.avgDeal)}</div><div className="s">closed won this quarter</div></div>
      </div>

      <PayPanel k={k} plan={p} quarter={quarter} deals={s.deals} isPro={isPro} />

      <div className="panel meter">
        <div className="meter-top">
          <strong>Quota progress · {quarterLabel(quarter)}</strong>
          <span className="muted">{Math.round(k.attainment * 100)}% of quota{tiers.length ? (nextTier ? ` · ${fmt(nextTier.at - k.closedValue)} until ${nextTier.rate}%` : ' · top tier reached') : ''}</span>
        </div>
        <div className="track" role="img" aria-label={`${fmt(k.closedValue)} closed against a ${fmt(p.quota)} quota`}>
          <div className="fill" style={{ width: `${w(k.closedValue)}%` }} />
          {placed.map((m, i) => <div key={i} className={`mark ${m.tier ? 'tier' : ''}`} style={{ left: `${m.x}%` }} />)}
        </div>
        <div className="marklabels" style={{ height: anyRow2 ? 46 : 30 }}>
          {placed.map((m, i) => <span key={i} className={m.tier ? 'tierl' : ''} style={{ left: `${m.x}%`, top: m.row2 ? 24 : undefined }}>{m.l}</span>)}
        </div>
        <div className="summary">
          <span>Paid so far <strong>{fmt(k.paid)}</strong></span>
          <span>Still to come when customers pay <strong>{fmt(k.toCome)}</strong></span>
          <span>Owed to you now <strong style={{ color: k.owedNow > 0.5 ? 'var(--red)' : undefined }}>{fmt(k.owedNow)}</strong></span>
          {k.repay > 0.5 && <span>Clawbacks to repay <strong style={{ color: 'var(--red)' }}>{fmt(k.repay)}</strong></span>}
          <span>Projected from open deals <strong>{fmt(k.projected)}</strong></span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h"><h3>Deal ledger</h3><span className="hint">{k.rows.length} deal{k.rows.length === 1 ? '' : 's'} in {quarterLabel(quarter)}</span></div>
        {k.rows.length ? (
          <div className="tscroll">
            <table>
              <thead><tr><th>Company</th><th>Stage</th><th>Close date</th><th className="r">Value</th><th className="r">Commission</th><th>Payout</th></tr></thead>
              <tbody>
                {k.rows.map((d) => {
                  const c = k.calc[d.id];
                  const ps = d.stage === 'Closed Won' ? payStatus(c) : null;
                  return (
                    <tr key={d.id} className="click">
                      <td>
                        <Link href={`/app/deals/${d.id}`} className="co" style={{ color: 'var(--ink)' }}>{d.company}</Link>
                        <div className="sub">{DEAL_TYPES.find((t) => t[0] === d.type)?.[1]}{d.partner ? ` · via ${d.partner}` : ''}{d.cancelled && d.cancelDate ? ` · cancelled ${fmtDate(d.cancelDate)}` : ''}</div>
                      </td>
                      <td><StagePill stage={d.stage} /></td>
                      <td className="num" style={{ fontSize: 12.5 }}>{fmtDate(d.closeDate)}{OPEN_STAGES.includes(d.stage) && <div className="est">expected</div>}</td>
                      <td className="r num">{fmt(d.value)}</td>
                      <td className="r num">
                        {d.stage === 'Closed Lost' ? <span className="muted">—</span> : c.clawed ? <span className="muted">$0</span> : <>{fmt(c.comm)}{c.est && <span className="est"> est.</span>}</>}
                        {c.crossed && <div className="est">crossed tier</div>}
                      </td>
                      <td>{ps ? <Pill tone={ps.tone}>{ps.label}</Pill> : d.stage === 'Closed Lost' ? null : <Pill tone="muted">Not closed</Pill>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h3>No deals in {quarterLabel(quarter)} yet</h3>
            <p>Add your first deal and your attainment and commission will appear here.</p>
            <Link className="btn" href={`/app/deals/new?q=${quarter}`}>+ Add deal</Link>
          </div>
        )}
      </section>
    </main>
  );
}
