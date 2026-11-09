import { NextResponse, type NextRequest } from 'next/server';

function setupPage(title: string, detail: string) {
  const esc = (s: string) => s.replace(/[<>&]/g, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)';
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
  const keyOk = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return new NextResponse(
    '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>earnlYne setup</title>' +
      '<body style="font-family:system-ui;max-width:640px;margin:60px auto;padding:0 16px;line-height:1.5">' +
      `<h1>${esc(title)}</h1><p><b>Error:</b> ${esc(detail)}</p>` +
      `<p><b>NEXT_PUBLIC_SUPABASE_URL:</b> ${url === '(missing)' ? 'missing' : urlOk ? 'present, format looks correct' : 'present, but the format looks wrong (expected https://xxxx.supabase.co with nothing after it)'}</p>` +
      `<p><b>NEXT_PUBLIC_SUPABASE_ANON_KEY:</b> ${keyOk ? 'present' : 'missing'}</p>` +
      '<p>Fix the value in Vercel → Environment Variables, then Redeploy.</p></body>',
    { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export async function middleware(request: NextRequest) {
  try {
    // Loaded on demand so that a library problem shows a readable error instead of crashing the site.
    const { updateSession } = await import('@/lib/supabase/middleware');
    return await updateSession(request);
  } catch (err) {
    console.error('Middleware failed', err);
    return setupPage('earnlYne can’t start its login check', String((err as Error)?.stack || (err as Error)?.message || err).slice(0, 600));
  }
}

export const config = {
  // Skip static files and the Stripe webhook (it must receive the raw, unmodified request).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
