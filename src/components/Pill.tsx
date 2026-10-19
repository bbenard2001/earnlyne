import type { Stage } from '@/lib/commission';

const toneClass = { ok: 'p-ok', warn: 'p-warn', bad: 'p-bad', info: 'p-info', muted: 'p-lost' } as const;
export function Pill({ tone, children }: { tone: keyof typeof toneClass; children: React.ReactNode }) {
  return <span className={`pill ${toneClass[tone]}`}>{children}</span>;
}
export function StagePill({ stage }: { stage: Stage }) {
  const cls = stage === 'Closed Won' ? 'p-won' : stage === 'Closed Lost' ? 'p-lost' : 'p-open';
  return <span className={`pill ${cls}`}>{stage}</span>;
}
