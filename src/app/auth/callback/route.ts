import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Lands email confirmation, password reset and Google sign-in links, then sends the user on. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') || '/app';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app';
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
