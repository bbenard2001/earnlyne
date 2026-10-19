'use client';
import { useState } from 'react';
import { fmt } from '@/lib/commission';

export function HeroCalc() {
  const [v, setV] = useState(250000);
  const a = Math.min(v, 200000), b = v - a;
  return (
    <div className="calc" aria-label="Quick commission estimate">
      <div className="l">Try the math · 8% to $200k, 11% after</div>
      <div className="tot">{fmt(a * 0.08 + b * 0.11)}</div>
      <label className="f" style={{ color: 'var(--on-navy-muted)' }}>
        Closed this quarter: <span className="mono" style={{ color: 'var(--on-navy)' }}>{fmt(v)}</span>
        <input type="range" min={0} max={400000} step={5000} value={v} onChange={(e) => setV(+e.target.value)} />
      </label>
      <div className="row"><span>First $200k at 8%</span><span className="mono">{fmt(a * 0.08)}</span></div>
      <div className="row"><span>Above $200k at 11%</span><span className="mono">{fmt(b * 0.11)}</span></div>
      <div className="row"><span>Quota attainment ($150k quota)</span><span className="mono">{Math.round((v / 150000) * 100)}%</span></div>
    </div>
  );
}
