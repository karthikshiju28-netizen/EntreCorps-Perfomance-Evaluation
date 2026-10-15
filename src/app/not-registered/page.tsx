import { createClient } from '@/lib/supabase/server';
import { signOut } from '../actions';

export default async function NotRegistered() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">You&apos;re not registered, contact SLT</h1>
      <p>You&apos;re signed in as {user?.email}, but you&apos;re not on the EntreCorps roster. Ask an SLT member to add you.</p>
      <form action={signOut}><button className="min-h-11 rounded border px-4">Sign out</button></form>
    </main>
  );
}
