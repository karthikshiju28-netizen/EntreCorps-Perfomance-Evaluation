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
      <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">← Dashboard</Link>
      <header className="card p-6">
        <h1 className="text-2xl font-bold tracking-tight">{me.full_name}</h1>
        <p className="text-sm text-muted">{me.role} · {me.projects}</p>
        <p className="mt-4 flex flex-wrap gap-2 text-sm">{[['Self', me.self_score], ['Manager', me.manager_score], ['Upward', me.upward_score], ['SLT', me.slt_score]].map(([k, v]) => (
            <span key={k as string} className="badge bg-navy-50 text-navy">{k as string} {f2(v as number | null) || '—'}</span>
          ))}
          <span className="badge bg-accent text-white">Composite {f2(me.composite) || '—'}</span></p>
      </header>
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Per-criterion averages</h2>
        <div className="card overflow-x-auto"><table className="table">
          <thead><tr><th>Component</th>{KEYS.map((k) => <th key={k} className="capitalize">{k}</th>)}</tr></thead>
          <tbody>{[...groups].map(([c, xs]) => (
            <tr key={c}><td className="font-semibold">{c}</td>{KEYS.map((k) => <td key={k}>{f2(avg(xs, k))}</td>)}</tr>
          ))}</tbody>
        </table></div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Every evaluation received</h2>
        <ul className="flex flex-col gap-2">
          {list.map((e: any) => (
            <li key={e.id} className="card p-4 text-sm">
              <div className="font-medium">
                {new Date(e.submitted_at).toLocaleDateString()} · {e.form_type} · {e.evaluator.full_name} ({e.evaluator_role}) · {e.cycles.round}
              </div>
              <div className="mt-1 text-xs text-muted">{KEYS.map((k) => e[k] != null ? `${k} ${e[k]}` : null).filter(Boolean).join(' · ')} · avg {f2(e.eval_avg)}</div>
              <p className="mt-3 leading-6">{e.comment}</p>
              {e.leadership_support && (
                <p className="mt-3 rounded-xl bg-accent-50 p-3 text-xs leading-5 text-ink">
                  <span className="font-semibold text-accent-600">Leadership could help with: </span>{e.leadership_support}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
