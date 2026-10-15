import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/Logo';
import { signOut } from '../actions';

export default async function NotRegistered() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-8 text-xl font-bold tracking-tight">You&apos;re not registered, contact SLT</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          You&apos;re signed in as <span className="font-semibold text-ink">{user?.email}</span>, but you&apos;re not on the EntreCorps roster. Ask an SLT member to add you.
        </p>
        <form action={signOut} className="mt-6"><button className="btn-ghost w-full">Sign out</button></form>
      </div>
    </main>
  );
}
