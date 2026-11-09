import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Setup check: shows which settings the live site sees and whether Supabase accepts them. Reveals no secrets. */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const kind = (k: string) =>
    !k ? 'missing' : k.startsWith('sb_publishable_') ? 'publishable key (new type)' : k.startsWith('sb_secret_') ? 'SECRET key (new type)' : k.startsWith('eyJ') ? 'legacy JWT key' : 'unrecognized format';
  const jwtRole = (k: string) => {
    try {
      const p = JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString());
      return { role: p.role, project: p.ref };
    } catch {
      return null;
    }
  };
  const projectFromUrl = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1] ?? null;

  async function probe(key: string) {
    if (!url || !key) return 'not tested';
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: 'no-store' });
      return r.ok ? 'ACCEPTED by Supabase' : `REJECTED by Supabase (HTTP ${r.status}: ${(await r.text()).slice(0, 120)})`;
    } catch (e) {
      return `could not reach Supabase: ${(e as Error).message}`;
    }
  }

  const report = {
    supabase_url: { value: url || 'missing', project_id: projectFromUrl ?? 'could not read — should be https://<project-id>.supabase.co' },
    anon_key: { type: kind(anon), starts_with: anon.slice(0, 18), length: anon.length, jwt: anon.startsWith('eyJ') ? jwtRole(anon) : undefined, test: await probe(anon) },
    service_role_key: { type: kind(service), length: service.length, jwt_role: service.startsWith('eyJ') ? jwtRole(service)?.role : undefined, test: await probe(service) },
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test key present' : process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE key present' : 'present, unrecognized format') : 'missing',
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? 'present' : 'not set yet',
      prices: ['STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_ANNUAL', 'STRIPE_PRICE_LIFETIME'].map((k) => `${k}: ${process.env[k]?.startsWith('price_') ? 'ok' : 'missing or wrong'}`),
    },
    site_url: process.env.NEXT_PUBLIC_SITE_URL || 'missing',
  };
  return NextResponse.json(report, { headers: { 'cache-control': 'no-store' } });
}
