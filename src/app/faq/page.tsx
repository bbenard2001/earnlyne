import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'FAQ' };

const QA: [string, string][] = [
  ['Am I allowed to use this at my job?', 'For logging your own deals and comp plan by hand, almost certainly yes: it’s your own record of your own pay. Some employers have rules about moving company data into outside tools, so check your handbook before uploading a CRM export.'],
  ['Can I use earnlYne to dispute a paycheck?', 'It’s a strong starting point for a conversation with your manager or payroll contact. It is not a legal filing or binding proof; your employer’s system and your signed comp plan are the source of truth.'],
  ['What if I make a data-entry mistake?', 'Every edit to a deal is logged with the old value, the new value and when it changed.'],
  ['What if my comp plan changes mid-year?', 'Save the new plan with a new effective date. Earlier versions are kept.'],
  ['Is the take-home number exact?', 'No. It estimates withholding at the rates you set. Your actual tax depends on your whole year, so treat it as a planning figure, not tax advice.'],
  ['How do I cancel?', 'Settings → Manage billing. You keep Pro until the end of the period you paid for, then drop to Free. Your data stays.'],
  ['I’m an SDR paid per meeting. Does this work for me?', 'Not yet. earnlYne is built for deal-value commission, the model that fits closing AEs.'],
];

export default function Faq() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <div className="pagehead"><div><h1>Questions people ask</h1></div></div>
        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          {QA.map(([q, a]) => (
            <div className="panel" style={{ padding: '16px 18px' }} key={q}>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{q}</h3>
              <p className="muted" style={{ margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
