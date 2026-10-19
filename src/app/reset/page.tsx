import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { ResetForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'New password' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page"><div className="narrow"><ResetForm /></div></main>
      <SiteFooter />
    </>
  );
}
