import { createClient } from '@/lib/supabase/server';
import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from('app_settings').select('value').eq('key', 'allowed_email_domain').maybeSingle();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">EntreCorps Evaluations</h1>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <LoginForm domain={data?.value ?? 'illinois.edu'} />
      <p className="text-center text-xs text-gray-500">
        <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/terms" className="underline">Terms of Use</a>
      </p>
    </main>
  );
}
