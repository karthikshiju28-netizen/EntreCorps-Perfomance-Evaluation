import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/Logo';
import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from('app_settings').select('value').eq('key', 'allowed_email_domain').maybeSingle();
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5 blur-2xl" />
        <Logo light />
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Fall 2026</p>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Feedback that helps every consultant grow.</h2>
          <p className="mt-4 text-white/70">
            Your evaluations are listed for you. Sign in with your Illinois account to see what&apos;s on your plate.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 mb-8 text-sm text-muted">Sign in to complete your evaluations.</p>
          {error && <p className="mb-4 rounded-xl border border-warn/20 bg-warn-50 p-3 text-sm text-warn">{error}</p>}
          <LoginForm domain={data?.value ?? 'illinois.edu'} />
          <p className="mt-10 text-center text-xs text-muted">
            <a href="/privacy" className="hover:text-ink hover:underline">Privacy Policy</a>
            <span className="mx-2">·</span>
            <a href="/terms" className="hover:text-ink hover:underline">Terms of Use</a>
          </p>
        </div>
      </section>
    </main>
  );
}
