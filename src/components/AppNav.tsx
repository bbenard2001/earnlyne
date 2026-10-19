'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app', label: 'Dashboard', pro: false },
  { href: '/app/paycheck', label: 'Pay check', pro: true },
  { href: '/app/take-home', label: 'Take-home', pro: true },
  { href: '/app/plan', label: 'Comp plan', pro: false },
  { href: '/app/settings', label: 'Settings', pro: false },
];

export function AppNav({ isPro }: { isPro: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === '/app' ? path === '/app' || path.startsWith('/app/deals') : path.startsWith(href));
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="wrap">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="tab" aria-current={active(t.href) ? 'page' : undefined}>
            {t.label}
            {t.pro && !isPro && <span className="lock">PRO</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
