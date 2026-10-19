import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { SignupForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Create your account' };

export default function Page({ searchParams }: { searchParams: { next?: string; plan?: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap page"><div className="narrow"><SignupForm next={searchParams.plan ? `/pricing?plan=${searchParams.plan}` : searchParams.next || '/app'} /></div></main>
      <SiteFooter />
    </>
  );
}
