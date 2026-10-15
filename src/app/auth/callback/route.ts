import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const fail = (m: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(m)}`);
  const sb = await createClient();
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return fail('Sign-in failed. Please try again.');

  const { data: s } = await sb.from('app_settings').select('value').eq('key', 'allowed_email_domain').maybeSingle();
  const domain = s?.value ?? 'illinois.edu';
  if (domain && !user.email.toLowerCase().endsWith('@' + domain)) {
    await sb.auth.signOut();
    return fail(`Please sign in with your @${domain} account.`);
  }
  const { data: pid } = await sb.rpc('current_person_id');
  return NextResponse.redirect(`${origin}${pid ? '/' : '/not-registered'}`);
}
