'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; message?: string };

const origin = () => {
  const h = headers();
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
};
const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === 'string' ? n : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/app';
};

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  if (!name) return { error: 'Enter your name.' };
  if (!email.includes('@')) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' };
  if (form.get('agree') !== 'on') return { error: 'Please accept the Terms of Service and Privacy Policy.' };
  const next = safeNext(form.get('next'));

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, accepted_terms: 'true' }, emailRedirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: `Check ${email} for a confirmation link to finish creating your account.` };
  redirect(next);
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get('email') || '').trim(),
    password: String(form.get('password') || ''),
  });
  if (error) return { error: error.message === 'Invalid login credentials' ? 'That email and password don’t match an account.' : error.message };
  redirect(safeNext(form.get('next')));
}

export async function signInWithGoogle(form: FormData) {
  const supabase = createClient();
  const next = safeNext(form.get('next'));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/login?error=google');
  redirect(data.url);
}

export async function sendReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') || '').trim();
  if (!email.includes('@')) return { error: 'Enter a valid email address.' };
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/callback?next=/reset` });
  if (error) return { error: error.message };
  return { message: `If an account exists for ${email}, a reset link is on its way.` };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') || '');
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' };
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect('/app');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
