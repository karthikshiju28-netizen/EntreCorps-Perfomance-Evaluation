'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ domain }: { domain: string }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = () => window.location.origin;

  async function google() {
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin()}/auth/callback`,
        queryParams: { hd: 'illinois.edu', prompt: 'select_account' },
      },
    });
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (domain && !addr.endsWith('@' + domain)) { setMsg(`Please use your @${domain} email.`); return; }
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: `${origin()}/auth/callback` },
    });
    setBusy(false);
    setMsg(error ? error.message : 'Check your email for the sign-in link.');
  }

  return (
    <>
      <button onClick={google} className="min-h-11 rounded bg-blue-700 px-4 py-2 font-medium text-white">
        Sign in with Google (Illinois account)
      </button>
      <p className="text-xs text-gray-600">
        First time? Turn on your Illinois Google account at{' '}
        <a className="underline" href="https://cloud-dashboard.illinois.edu">cloud-dashboard.illinois.edu</a>{' '}
        (set Google Apps @ Illinois to On), then come back.
      </p>
      <div className="text-center text-sm text-gray-500">or</div>
      <form onSubmit={magic} className="flex flex-col gap-2">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="netid@illinois.edu" className="min-h-11 rounded border px-3"
        />
        <button disabled={busy} className="min-h-11 rounded border border-blue-700 px-4 py-2 font-medium text-blue-700">
          Email me a sign-in link
        </button>
      </form>
      <p className="text-xs text-gray-600">If Google says it can&apos;t find your account, use the email link instead.</p>
      {msg && <p className="text-sm">{msg}</p>}
    </>
  );
}
