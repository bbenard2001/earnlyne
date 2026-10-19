import Link from 'next/link';
import { loadSession } from '@/lib/data';
import { NameForm } from '@/components/NameForm';
import { signOut } from '@/app/auth/actions';
import { deleteAccount } from '@/app/app/actions';

export const metadata = { title: 'Settings' };

export default async function Settings({ searchParams }: { searchParams: { checkout?: string; delete?: string } }) {
  const s = await loadSession();
  const e = s.ent;
  const renew = e.renewsAt ? new Date(e.renewsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  return (
    <main className="wrap page">
      <div className="pagehead"><div><h1>Settings</h1><p>{s.email}</p></div></div>
      {searchParams.checkout === 'success' && (
        <p className="note" style={{ borderColor: 'var(--teal)' }}>
          Thanks! Your payment went through. If Pro doesn’t show yet, refresh in a few seconds while Stripe confirms it.
        </p>
      )}

      <section className="panel card">
        <h3 style={{ fontSize: 15 }}>Account</h3>
        <NameForm name={s.name} />
        <form action={signOut}><button className="btn sm ghost" type="submit">Log out</button></form>
      </section>

      <section className="panel card">
        <h3 style={{ fontSize: 15 }}>Plan and billing</h3>
        {e.tier === 'pro' ? (
          <p style={{ margin: 0 }}>
            You’re on <strong>{e.lifetime ? 'Lifetime' : 'Pro'}</strong>.
            {!e.lifetime && renew && (e.cancelAtPeriodEnd ? ` Pro ends on ${renew}; you won’t be charged again.` : ` Renews on ${renew}.`)}
            {e.status === 'past_due' && <span className="err"> Your last payment failed. Update your card to keep Pro.</span>}
          </p>
        ) : (
          <p style={{ margin: 0 }}>You’re on the <strong>Free</strong> plan: the current quarter only.</p>
        )}
        <div className="ctrls">
          {e.tier !== 'pro' && <Link className="btn teal" href="/pricing">Upgrade to Pro</Link>}
          {e.hasCustomer && (
            <form action="/api/stripe/portal" method="post"><button className="btn ghost" type="submit">Manage billing and invoices</button></form>
          )}
        </div>
      </section>

      <section className="panel card">
        <h3 style={{ fontSize: 15 }}>Your data</h3>
        <p className="muted" style={{ margin: 0 }}>Download every deal as a CSV file you can open in Excel or Google Sheets.</p>
        <div>{e.tier === 'pro' ? <a className="btn ghost" href="/api/export">Download deals (CSV)</a> : <span className="lockpill">CSV export is a Pro feature</span>}</div>
      </section>

      <section className="panel card" style={{ borderColor: 'var(--red-tint)' }}>
        <h3 style={{ fontSize: 15, color: 'var(--red)' }}>Delete account</h3>
        <p className="muted" style={{ margin: 0 }}>Permanently deletes your account, comp plans, deals and history, and cancels any subscription. This can’t be undone.</p>
        <form action={deleteAccount} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <label className="f" style={{ flex: '1 1 220px' }}>Type DELETE to confirm<input type="text" name="confirm" autoComplete="off" /></label>
          <button className="btn danger" type="submit">Delete my account</button>
        </form>
        {searchParams.delete === 'confirm' && <p className="err" style={{ margin: 0 }}>Type DELETE in capitals to confirm.</p>}
      </section>
    </main>
  );
}
