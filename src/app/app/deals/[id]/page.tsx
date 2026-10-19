import { notFound, redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { DealForm } from '@/components/DealForm';
import { computeQuarter, quarterOf, fmt } from '@/lib/commission';

export const metadata = { title: 'Edit deal' };

export default async function EditDeal({ params }: { params: { id: string } }) {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  const deal = s.deals.find((d) => d.id === params.id);
  if (!deal) notFound();
  const supabase = createClient();
  const { data: history } = await supabase
    .from('deal_edit_history').select('field, old_value, new_value, changed_at').eq('deal_id', deal.id).order('changed_at', { ascending: false }).limit(25);
  const c = computeQuarter(quarterOf(deal.closeDate)!, s.plan, s.deals).calc[deal.id];
  return (
    <main className="wrap page">
      <div className="narrow" style={{ display: 'grid', gap: 16 }}>
        <DealForm deal={deal} defaultDate={deal.closeDate} clawbackDays={s.plan.clawbackDays} />
        {c && (
          <section className="panel" style={{ padding: '14px 18px' }}>
            <div className="lbl">Commission on this deal</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, margin: '4px 0' }}>{fmt(c.comm)}{c.est ? ' est.' : ''}</div>
            <div className="hint mono">{c.how}</div>
          </section>
        )}
        <section className="panel" style={{ padding: '14px 18px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Edit history</div>
          {history && history.length ? (
            <div className="hist" style={{ borderTop: 0, paddingTop: 0 }}>
              {history.map((h, i) => (
                <div key={i}>
                  {h.changed_at ? new Date(h.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now'} · {h.field}: <s>{h.old_value}</s> → {h.new_value}
                </div>
              ))}
            </div>
          ) : (
            <p className="hint" style={{ margin: 0 }}>No edits yet. Changes you make are logged here with the old and new value.</p>
          )}
        </section>
      </div>
    </main>
  );
}
