'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { signIn, signUp, sendReset, updatePassword, signInWithGoogle, type AuthState } from '@/app/auth/actions';

function Submit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending || disabled}>
      {pending ? 'One moment…' : children}
    </button>
  );
}
function Status({ state }: { state: AuthState }) {
  return (
    <div role="alert" aria-live="polite">
      {state.error && <p className="err" style={{ margin: 0 }}>{state.error}</p>}
      {state.message && <p className="ok" style={{ margin: 0 }}>{state.message}</p>}
    </div>
  );
}
function Google({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <button className="btn ghost" style={{ width: '100%' }} type="submit">Continue with Google</button>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useFormState(signUp, {});
  const [agree, setAgree] = useState(false);
  return (
    <div className="panel card">
      <div>
        <h1>Create your account</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>Free to start. No credit card required.</p>
      </div>
      <Google next={next} />
      <form action={action} style={{ display: 'grid', gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <label className="f">Full name<input type="text" name="name" autoComplete="name" required /></label>
        <label className="f">Email<input type="email" name="email" autoComplete="email" required /></label>
        <label className="f">Password<input type="password" name="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" /></label>
        <label className="check">
          <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link></span>
        </label>
        <Status state={state} />
        <Submit disabled={!agree}>Create account</Submit>
      </form>
      <p className="hint" style={{ textAlign: 'center', margin: 0 }}>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></p>
    </div>
  );
}

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [state, action] = useFormState(signIn, error ? { error } : {});
  return (
    <div className="panel card">
      <h1>Log in</h1>
      <Google next={next} />
      <form action={action} style={{ display: 'grid', gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <label className="f">Email<input type="email" name="email" autoComplete="email" required /></label>
        <label className="f">Password<input type="password" name="password" autoComplete="current-password" required /></label>
        <Status state={state} />
        <Submit>Log in</Submit>
      </form>
      <p className="hint" style={{ textAlign: 'center', margin: 0 }}>
        <Link href="/forgot">Forgot your password?</Link> · No account? <Link href="/signup">Start free</Link>
      </p>
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useFormState(sendReset, {});
  return (
    <form className="panel card" action={action}>
      <h1>Reset your password</h1>
      <label className="f">Email<input type="email" name="email" autoComplete="email" required /></label>
      <Status state={state} />
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useFormState(updatePassword, {});
  return (
    <form className="panel card" action={action}>
      <h1>Choose a new password</h1>
      <label className="f">New password<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
      <Status state={state} />
      <Submit>Save password</Submit>
    </form>
  );
}
