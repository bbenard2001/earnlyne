import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="earnlYne home" style={{ textDecoration: 'none' }}>
      <svg width="26" height="26" viewBox="0 0 160 160" aria-hidden="true">
        <rect width="160" height="160" rx="34" fill="#16C98A" />
        <polyline points="32,124 72,86 100,102 120,48" fill="none" stroke="#0B1220" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="120" cy="48" r="11" fill="#0B1220" />
      </svg>
      <span>
        earnl<b>Y</b>ne
      </span>
    </Link>
  );
}
