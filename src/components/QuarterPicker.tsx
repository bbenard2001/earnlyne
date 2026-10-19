'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { quarterLabel } from '@/lib/commission';

export function QuarterPicker({ value, options, locked }: { value: string; options: string[]; locked: boolean }) {
  const router = useRouter();
  const path = usePathname();
  if (locked)
    return (
      <span className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ color: 'var(--ink)' }}>{quarterLabel(value)}</strong>
        <Link href="/pricing" className="lockpill" style={{ textDecoration: 'none' }}>Other quarters: Pro</Link>
      </span>
    );
  return (
    <label className="f" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <span>Quarter</span>
      <select value={value} onChange={(e) => router.push(`${path}?q=${e.target.value}`)} style={{ width: 'auto' }}>
        {options.map((q) => (
          <option key={q} value={q}>{quarterLabel(q)}</option>
        ))}
      </select>
    </label>
  );
}
