import Link from 'next/link';
import { SiteFooter } from '@/components/SiteHeader';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <>
      <header className="top"><div className="wrap"><Logo /></div></header>
      <main className="wrap page"><div className="empty"><h3>We couldn’t find that page</h3><p>It may have moved or never existed.</p><Link className="btn" href="/">Go home</Link></div></main>
      <SiteFooter />
    </>
  );
}
