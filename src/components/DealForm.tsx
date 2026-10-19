'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveDeal, deleteDeal } from '@/app/app/actions';
import { STAGES, OPEN_STAGES, DEAL_TYPES, todayISO, type Deal, type Stage } from '@/lib/commission';

function SaveBtn({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Saving…' : isNew ? 'Save deal' : 'Save changes'}</button>;
}

export function DealForm({ deal, defaultDate, clawbackDays }: { deal?: Deal; defaultDate: string; clawbackDays: number }) {
  const [state, action] = useFormState(saveDeal, {});
  const [stage, setStage] = useState<Stage>(deal?.stage ?? 'Negotiation');
  const [cancelled, setCancelled] = useState(!!deal?.cancelled);
  const [armDelete, setArmDelete] = useState(false);
  const isNew = !deal;
  const won = stage === 'Closed Won';

  return (
    <div className="panel card">
      <form action={action} style={{ display: 'grid', gap: 16 }}>
        <h1>{isNew ? 'Add deal' : 'Edit deal'}</h1>
        {deal && <input type="hidden" name="id" value={deal.id} />}
        <input type="hidden" name="stage" value={stage} />
        <label className="f">Company<input type="text" name="company" defaultValue={deal?.company} placeholder="Acme Manufacturing" autoComplete="off" required autoFocus={isNew} /></label>
        <div className="fgrid">
          <label className="f">Deal value ($)<input type="text" inputMode="decimal" name="value" defaultValue={deal?.value || ''} placeholder="0" required /></label>
          <label className="f">{OPEN_STAGES.includes(stage) ? 'Expected close date' : 'Close date'}<input type="date" name="close_date" defaultValue={deal?.closeDate || defaultDate} required /></label>
        </div>
        <div className="f" style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>
          Stage
          <div className="chips" role="group" aria-label="Stage">
            {STAGES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={stage === s} onClick={() => setStage(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div className="fgrid">
          <label className="f">Deal type
            <select name="type" defaultValue={deal?.type || 'new'}>{DEAL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="f">Channel partner <span className="hint">(optional)</span><input type="text" name="partner" defaultValue={deal?.partner} autoComplete="off" /></label>
        </div>
        {won && (
          <>
            <div className="fgrid">
              <label className="tog"><span><strong style={{ fontSize: 13 }}>Customer has paid</strong><br /><span className="hint">Releases the rest of the commission</span></span><input type="checkbox" name="collected" defaultChecked={deal?.collected} /></label>
              <label className="f">Paid to you so far ($)<span className="hint">From your pay stubs</span><input type="text" inputMode="decimal" name="paid" defaultValue={deal?.paid || ''} placeholder="0" /></label>
            </div>
            <div className="fgrid">
              <label className="tog"><span><strong style={{ fontSize: 13 }}>Customer cancelled</strong><br /><span className="hint">{clawbackDays ? `Inside the ${clawbackDays}-day window, commission is clawed back` : 'Your plan has no clawback'}</span></span><input type="checkbox" name="cancelled" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} /></label>
              {cancelled ? <label className="f">Cancel date<input type="date" name="cancel_date" defaultValue={deal?.cancelDate || todayISO()} /></label> : <span />}
            </div>
          </>
        )}
        {state.error && <p className="err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
        <div className="sheet-f">
          <Link className="btn ghost" href="/app">Cancel</Link>
          <SaveBtn isNew={isNew} />
        </div>
      </form>
      {deal && (
        <form action={deleteDeal} className="ctrls" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <input type="hidden" name="id" value={deal.id} />
          {armDelete ? (
            <>
              <button className="btn danger" type="submit">Yes, delete this deal</button>
              <button className="btn ghost" type="button" onClick={() => setArmDelete(false)}>Keep it</button>
            </>
          ) : (
            <button className="btn ghost" type="button" style={{ color: 'var(--red)' }} onClick={() => setArmDelete(true)}>Delete deal</button>
          )}
        </form>
      )}
    </div>
  );
}
