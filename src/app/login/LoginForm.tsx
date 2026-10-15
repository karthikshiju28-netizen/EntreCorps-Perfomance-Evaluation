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
    <div className="flex flex-col gap-4">
      <button onClick={google} className="btn-primary w-full">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
          <path fill="#fff" fillOpacity=".8" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
          <path fill="#fff" fillOpacity=".6" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14Z" />
          <path fill="#fff" fillOpacity=".9" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10c.8-2.3 3-4 5.6-4Z" />
        </svg>
        Sign in with Google (Illinois account)
      </button>
      <p className="rounded-xl bg-navy-50 p-3 text-xs leading-5 text-navy">
        First time? Turn on your Illinois Google account at{' '}
        <a className="font-semibold underline" href="https://cloud-dashboard.illinois.edu">cloud-dashboard.illinois.edu</a>{' '}
        (set Google Apps @ Illinois to On), then come back.
      </p>
      <div className="my-2 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={magic} className="flex flex-col gap-3">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="netid@illinois.edu" className="input"
        />
        <button disabled={busy} className="btn-ghost w-full">Email me a sign-in link</button>
      </form>
      <p className="text-xs text-muted">If Google says it can&apos;t find your account, use the email link instead.</p>
      {msg && <p className="rounded-xl bg-good-50 p-3 text-sm text-good">{msg}</p>}
    </div>
  );
}
