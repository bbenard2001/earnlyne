import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { resolveQuarter } from '@/lib/quarter';
import { DealForm } from '@/components/DealForm';
import { currentQuarter, todayISO } from '@/lib/commission';

export const metadata = { title: 'Add deal' };

export default async function NewDeal({ searchParams }: { searchParams: { q?: string } }) {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  const q = resolveQuarter(searchParams.q, s.ent);
  const [y, qq] = q.split('-Q');
  const date = q === currentQuarter() ? todayISO() : `${y}-${String((+qq - 1) * 3 + 2).padStart(2, '0')}-15`;
  return (
    <main className="wrap page"><div className="narrow"><DealForm defaultDate={date} clawbackDays={s.plan.clawbackDays} /></div></main>
  );
}
