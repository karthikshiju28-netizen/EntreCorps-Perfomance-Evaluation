'use client';
import { useActionState } from 'react';

type R = { ok: boolean; message: string } | null;
export default function ActionForm({ action, children, submit }: {
  action: (prev: R, fd: FormData) => Promise<NonNullable<R>>; children: React.ReactNode; submit: string;
}) {
  const [state, run, pending] = useActionState(action, null as R);
  return (
    <form action={run} className="flex flex-col gap-2">
      {children}
      <button disabled={pending} className="w-fit rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40">{submit}</button>
      {state && <p className={`whitespace-pre-wrap text-sm ${state.ok ? 'text-green-700' : 'text-red-700'}`}>{state.message}</p>}
    </form>
  );
}
