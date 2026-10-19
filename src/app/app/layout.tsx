import { Logo } from '@/components/Logo';
import { AppNav } from '@/components/AppNav';
import { SiteFooter } from '@/components/SiteHeader';
import { loadSession } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await loadSession();
  const initials = s.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Logo href="/app" />
          {s.ent.tier === 'pro' ? <span className="pill p-ok">Pro</span> : <a className="testpill" href="/pricing" style={{ textDecoration: 'none' }}>Free plan · Upgrade</a>}
          <span className="sp" />
          <span className="who"><span className="avatar">{initials}</span><span>{s.name}</span></span>
        </div>
        <AppNav isPro={s.ent.tier === 'pro'} />
      </header>
      {children}
      <SiteFooter />
    </>
  );
}
