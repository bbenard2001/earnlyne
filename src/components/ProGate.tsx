import Link from 'next/link';
import { PRO_FEATURES } from '@/lib/billing';

export function ProGate({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="panel gate">
      <span className="lockpill">Pro feature</span>
      <h2>{title}</h2>
      {children}
      <ul>
        {PRO_FEATURES.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link className="btn teal" href="/pricing">See Pro plans, from $11/month</Link>
    </section>
  );
}
