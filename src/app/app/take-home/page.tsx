import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { resolveQuarter, quarterOptions } from '@/lib/quarter';
import { QuarterPicker } from '@/components/QuarterPicker';
import { ProGate } from '@/components/ProGate';
import { MoneyPlanner } from '@/components/MoneyPlanner';
import { computeQuarter, yearEarned, quarterLabel } from '@/lib/commission';

export const metadata = { title: 'Take-home' };

export default async function TakeHomePage({ searchParams }: { searchParams: { q?: string } }) {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  if (s.ent.tier !== 'pro')
    return (
      <main className="wrap page">
        <ProGate title="See what your commission leaves after tax, and where it should go">
          <p className="muted" style={{ margin: 0 }}>Estimate withholding, split take-home pay into savings, retirement and investing, and see what steady investing could grow to.</p>
        </ProGate>
      </main>
    );
  const quarter = resolveQuarter(searchParams.q, s.ent), year = quarter.split('-')[0];
  const grossQ = computeQuarter(quarter, s.plan, s.deals).earned, grossY = yearEarned(year, s.plan, s.deals);
  return (
    <main className="wrap page">
      <div className="pagehead">
        <div><h1>Take-home and reinvesting</h1><p>Estimate what your commission leaves after withholding, then decide where each dollar goes. Based on commission earned; the money arrives on your payout schedule.</p></div>
        <div className="ctrls"><QuarterPicker value={quarter} options={quarterOptions(s.deals, quarter)} locked={false} /></div>
      </div>
      <MoneyPlanner initial={s.money} grossQ={grossQ} grossY={grossY} qLabel={quarterLabel(quarter)} year={year} />
      <p className="note">Planning illustration only. earnlYne is not a tax or financial advisor; check withholding and investment choices with a professional.</p>
    </main>
  );
}
