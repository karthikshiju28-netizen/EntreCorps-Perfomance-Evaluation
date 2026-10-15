'use client';
import { useActionState } from 'react';

type R = { ok: boolean; message: string } | null;
export default function ActionForm({ action, children, submit }: {
  action: (prev: R, fd: FormData) => Promise<NonNullable<R>>; children: React.ReactNode; submit: string;
}) {
  const [state, run, pending] = useActionState(action, null as R);
  return (
    <form action={run} className="flex flex-col gap-3">
      {children}
      <button disabled={pending} className="btn-primary w-fit">{submit}</button>
      {state && <p className={`whitespace-pre-wrap text-sm ${state.ok ? 'text-good' : 'text-warn'}`}>{state.message}</p>}
    </form>
  );
}
