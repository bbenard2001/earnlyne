import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Refreshes the auth session cookie on every request and protects /app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Not configured yet: show a setup notice instead of crashing every page.
    return new NextResponse(
      '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>earnlYne setup</title>' +
        '<body style="font-family:system-ui;max-width:560px;margin:60px auto;padding:0 16px;line-height:1.5">' +
        '<h1>earnlYne is almost ready</h1><p>The site is missing its Supabase settings. In Vercel, open <b>Project → Settings → Environment Variables</b>, add ' +
        '<code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (plus the other keys in the setup guide), then <b>Redeploy</b>.</p></body>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    console.error('Supabase session check failed — check NEXT_PUBLIC_SUPABASE_URL / ANON_KEY', err);
  }

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}
