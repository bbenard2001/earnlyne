import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <div className="banner"><div className="wrap">Draft placeholder. Replace with an attorney-reviewed Privacy Policy before you take real payments.</div></div>
      <main className="wrap page legal">
        <h1>Privacy Policy</h1>
        <div dangerouslySetInnerHTML={{ __html: `<h2>What we collect</h2><p>Your name, email, the comp plan and deals you enter, and billing status from Stripe. We never see your card number.</p><h2>How we use it</h2><p>Only to run the service for you. We do not sell your data or share it with your employer.</p><h2>Where it is stored</h2><p>In a database hosted by Supabase, protected so only your account can read your records. Payments are handled by Stripe.</p><h2>Your choices</h2><p>Export your deals anytime (Pro) and delete your account and all its data from Settings.</p><h2>Contact</h2><p>[Your support email.]</p>` }} />
      </main>
      <SiteFooter />
    </>
  );
}
