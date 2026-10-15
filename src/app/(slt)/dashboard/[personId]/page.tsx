import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const f2 = (n: number | null | undefined) => (n == null ? '' : Number(n).toFixed(2));
const KEYS = ['technical', 'communication', 'reliability', 'teamwork', 'initiative', 'leadership'] as const;
const COMPONENT = (e: any, id: string) =>
  e.evaluator_id === id ? 'Self' : e.evaluator_role === 'SLT' ? 'SLT' : e.evaluator_role === 'Consultant' ? 'Upward' : 'Manager';

export default async function Person({ params, searchParams }: { params: Promise<{ personId: string }>; searchParams: Promise<{ term?: string; round?: string }> }) {
  const { personId } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const term = sp.term || null; const round = sp.round || 'All Rounds';
  const { data: scores } = await sb.rpc('person_scores', { p_term: term, p_round: round });
  const me = (scores ?? []).find((s: any) => s.person_id === personId);
  if (!me) notFound();

  const { data: evals } = await sb.from('evaluations')
    .select('*, cycles!inner(term, round), evaluator:people!evaluations_evaluator_id_fkey(full_name)')
    .eq('evaluatee_id', personId).order('submitted_at', { ascending: false });
  const list = (evals ?? []).filter((e: any) => (!term || e.cycles.term === term) && (round === 'All Rounds' || e.cycles.round === round));

  const groups = new Map<string, any[]>();
  list.forEach((e: any) => { const c = COMPONENT(e, personId); groups.set(c, [...(groups.get(c) ?? []), e]); });
  const avg = (xs: any[], k: string) => { const v = xs.map((x) => x[k]).filter((n) => n != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-blue-700 underline">← Dashboard</Link>
      <header>
        <h1 className="text-2xl font-semibold">{me.full_name}</h1>
        <p className="text-sm text-gray-600">{me.role} · {me.projects}</p>
        <p className="mt-2 text-sm">Self {f2(me.self_score)} · Manager {f2(me.manager_score)} · Upward {f2(me.upward_score)} · SLT {f2(me.slt_score)} · <b>Composite {f2(me.composite)}</b></p>
      </header>
      <section>
        <h2 className="mb-2 font-semibold">Per-criterion averages</h2>
        <table className="w-full rounded border bg-white text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-left">Component</th>{KEYS.map((k) => <th key={k} className="p-2 text-left capitalize">{k}</th>)}</tr></thead>
          <tbody>{[...groups].map(([c, xs]) => (
            <tr key={c} className="border-t"><td className="p-2">{c}</td>{KEYS.map((k) => <td key={k} className="p-2">{f2(avg(xs, k))}</td>)}</tr>
          ))}</tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Every evaluation received</h2>
        <ul className="flex flex-col gap-2">
          {list.map((e: any) => (
            <li key={e.id} className="rounded border bg-white p-3 text-sm">
              <div className="font-medium">
                {new Date(e.submitted_at).toLocaleDateString()} · {e.form_type} · {e.evaluator.full_name} ({e.evaluator_role}) · {e.cycles.round}
              </div>
              <div className="text-gray-600">{KEYS.map((k) => e[k] != null ? `${k} ${e[k]}` : null).filter(Boolean).join(' · ')} · avg {f2(e.eval_avg)}</div>
              <p className="mt-1">{e.comment}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
