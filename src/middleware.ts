import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    // Never take the whole site down: explain the problem instead.
    console.error('Middleware failed', err);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)';
    const looksOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
    const msg = String((err as Error)?.message || err).replace(/[<>&]/g, '');
    return new NextResponse(
      '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>earnlYne setup</title>' +
        '<body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 16px;line-height:1.5">' +
        '<h1>earnlYne can’t reach its database yet</h1>' +
        `<p><b>Error:</b> ${msg}</p>` +
        `<p><b>NEXT_PUBLIC_SUPABASE_URL format:</b> ${looksOk ? 'looks correct' : 'looks wrong. It should look like https://abcdefgh.supabase.co with no slash or spaces at the end'}</p>` +
        '<p>Fix the value in Vercel → Environment Variables, then Redeploy.</p></body>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
}

export const config = {
  // Skip static files and the Stripe webhook (it must receive the raw, unmodified request).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
