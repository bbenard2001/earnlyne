'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { importDeals, type ImportResult } from '@/app/app/actions';

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const run = () => {
    if (!file) return;
    start(async () => {
      const text = await file.text();
      setRes(await importDeals(text));
    });
  };
  return (
    <section className="panel card">
      <label className="f">CSV file
        <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRes(null); }} />
      </label>
      <div className="ctrls">
        <button className="btn" onClick={run} disabled={!file || pending}>{pending ? 'Importing…' : 'Import deals'}</button>
        {res?.imported ? <Link className="btn ghost" href="/app">Go to dashboard</Link> : null}
      </div>
      {res?.error && <p className="err" role="alert" style={{ margin: 0 }}>{res.error}</p>}
      {res && !res.error && (
        <div role="status" style={{ display: 'grid', gap: 6 }}>
          <p className="ok" style={{ margin: 0 }}>Imported {res.imported} deal{res.imported === 1 ? '' : 's'}.</p>
          {!!res.skipped?.length && (
            <div className="hint">
              <strong style={{ color: 'var(--ink)' }}>Skipped {res.skipped.length}:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {res.skipped.slice(0, 30).map((s) => <li key={s.line}>Row {s.line}: {s.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
