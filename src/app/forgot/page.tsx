import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { ForgotForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Reset password' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page"><div className="narrow"><ForgotForm /></div></main>
      <SiteFooter />
    </>
  );
}
