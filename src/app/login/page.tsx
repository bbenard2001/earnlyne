import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { LoginForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Log in' };

export default function Page({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap page"><div className="narrow"><LoginForm next={searchParams.next || '/app'} error={searchParams.error ? 'That sign-in link didn’t work. Try again.' : undefined} /></div></main>
      <SiteFooter />
    </>
  );
}
