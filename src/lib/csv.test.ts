import { describe, expect, it } from 'vitest';
import { parseCsv, rowsFromCsv, parseDate } from './csv';

describe('csv import', () => {
  it('parses quotes, commas and CRLF', () => {
    expect(parseCsv('a,b\r\n"Fenwick & Ames, Inc.","$1,000"\r\n')).toEqual([['a', 'b'], ['Fenwick & Ames, Inc.', '$1,000']]);
  });
  it('reads US and ISO dates', () => {
    expect(parseDate('11/5/2026')).toBe('2026-11-05');
    expect(parseDate('2026-11-05')).toBe('2026-11-05');
    expect(parseDate('2/30/2026')).toBeNull();
  });
  it('maps headers and validates rows', () => {
    const csv = 'Company,Deal value,Stage,Type,Close date,Partner,Customer paid,Paid to you\n' +
      'Acme,"$64,000",Closed Won,New business,10/14/2026,,yes,"$2,560"\n' +
      'Beta,abc,Proposal,,11/20/2026,,,\n' +
      'Gamma,5000,Negotiation,Renewal,2026-12-01,Redline,yes,100\n';
    const r = rowsFromCsv(csv);
    expect(r.missing).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].row).toMatchObject({ company: 'Acme', value: 64000, stage: 'Closed Won', close_date: '2026-10-14', collected: true, paid: 2560 });
    expect(r.rows[1].row).toMatchObject({ deal_type: 'renewal', collected: false, paid: 0 });
    expect(r.errors[0]).toMatchObject({ line: 3 });
  });
  it('reports missing columns', () => {
    expect(rowsFromCsv('Name,Amount\nA,1').missing).toEqual(['stage', 'close date']);
  });
});
