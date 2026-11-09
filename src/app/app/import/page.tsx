import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/data';
import { ImportForm } from '@/components/ImportForm';

export const metadata = { title: 'Import deals' };

export default async function ImportPage() {
  const s = await loadSession();
  if (!s.plan) redirect('/app/plan?setup=1');
  return (
    <main className="wrap page">
      <div className="narrow" style={{ display: 'grid', gap: 16 }}>
        <div className="pagehead"><div><h1>Import deals from a spreadsheet</h1>
          <p>Save your spreadsheet as <strong>CSV</strong> (in Excel: File → Save As → CSV UTF-8) and upload it. Commission is calculated automatically from your comp plan.</p></div></div>
        <ImportForm />
        <section className="panel" style={{ padding: '16px 18px' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Columns</div>
          <div className="tscroll"><table>
            <thead><tr><th>Header</th><th>Required</th><th>Example</th></tr></thead>
            <tbody>
              <tr><td>Company</td><td>Yes</td><td>Fenwick &amp; Ames</td></tr>
              <tr><td>Value</td><td>Yes</td><td>118000 or $118,000</td></tr>
              <tr><td>Stage</td><td>Yes</td><td>Prospecting, Proposal, Negotiation, Closed Won, Closed Lost</td></tr>
              <tr><td>Close date</td><td>Yes</td><td>2026-11-15 or 11/15/2026 (expected date for open deals)</td></tr>
              <tr><td>Type</td><td>No</td><td>New business (default), Upsell, Renewal</td></tr>
              <tr><td>Partner</td><td>No</td><td>Redline Partners</td></tr>
              <tr><td>Customer paid</td><td>No</td><td>Yes / No (closed-won deals)</td></tr>
              <tr><td>Paid to you</td><td>No</td><td>Commission received so far, e.g. 4500</td></tr>
            </tbody>
          </table></div>
          <p className="hint" style={{ marginBottom: 0 }}>{s.ent.tier === 'pro' ? 'Every quarter is imported.' : 'On the Free plan only deals in the current quarter are imported; others are listed as skipped.'} Importing again adds the deals again, so don’t upload the same file twice.</p>
        </section>
      </div>
    </main>
  );
}
