import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <div className="banner"><div className="wrap">Draft placeholder. Replace with an attorney-reviewed Terms of Service before you take real payments.</div></div>
      <main className="wrap page legal">
        <h1>Terms of Service</h1>
        <div dangerouslySetInnerHTML={{ __html: `<h2>1. The service</h2><p>earnlYne helps you record your own deals and estimate your own commission. Figures are for personal reference only and are not an official payroll record.</p><h2>2. Accounts</h2><p>You are responsible for your account and for the accuracy of what you enter.</p><h2>3. Subscriptions and billing</h2><p>Paid plans renew automatically until canceled. You can cancel anytime in Settings; access continues to the end of the paid period. Lifetime is a one-time payment.</p><h2>4. Not professional advice</h2><p>earnlYne does not provide legal, tax, payroll or financial advice.</p><h2>5. Limitation of liability</h2><p>[To be drafted by your attorney.]</p><h2>6. Contact</h2><p>[Your business name, address and support email.]</p>` }} />
      </main>
      <SiteFooter />
    </>
  );
}
