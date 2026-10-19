'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { updateName } from '@/app/app/actions';

function Btn() {
  const { pending } = useFormStatus();
  return <button className="btn sm ghost" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save name'}</button>;
}
export function NameForm({ name }: { name: string }) {
  const [state, action] = useFormState(updateName, {});
  return (
    <form action={action} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
      <label className="f" style={{ flex: '1 1 220px' }}>Your name<input type="text" name="name" defaultValue={name} required /></label>
      <Btn />
      {state.error && <span className="err">{state.error}</span>}
      {state.ok && <span className="ok">Saved</span>}
    </form>
  );
}
