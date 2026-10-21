import { redirect, notFound } from 'next/navigation';
import { createClient } from './supabase/server';

export async function requirePerson() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: pid } = await sb.rpc('current_person_id');
  if (!pid) redirect('/not-registered');
  const { data: person } = await sb.from('people').select('id, full_name, role').eq('id', pid).single();
  if (!person) redirect('/not-registered');
  const { data: asg } = await sb.from('assignments').select('projects(id,name,sort_order)').eq('person_id', pid);
  const projects = (asg ?? []).map((a: any) => a.projects).filter(Boolean).sort((a: any, b: any) => a.sort_order - b.sort_order);
  return { sb, user, person, projects: projects as { id: string; name: string }[] };
}

export async function requireSlt() {
  const ctx = await requirePerson();
  const { data } = await ctx.sb.rpc('is_slt');
  if (!data) notFound();
  return ctx;
}

// SLT and External Leads can view the Dashboard; only SLT can use Admin.
export async function requireDashboard() {
  const ctx = await requirePerson();
  const { data } = await ctx.sb.rpc('can_view_dashboard');
  if (!data) notFound();
  return ctx;
}
