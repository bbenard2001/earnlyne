import Link from 'next/link';
import { Logo } from './Logo';
import { createClient } from '@/lib/supabase/server';

export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <header className="top">
      <div className="wrap">
        <Logo />
        <span className="sp" />
        <nav className="navlinks" aria-label="Site">
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          {user ? (
            <Link className="btn sm" href="/app">Open my dashboard</Link>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link className="btn sm" href="/signup">Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>© {new Date().getFullYear()} earnlYne. Figures are for personal reference only: not an official payroll record, and not tax or financial advice.</span>
        <span style={{ display: 'flex', gap: 14 }}>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/faq">FAQ</Link>
        </span>
      </div>
    </footer>
  );
}
