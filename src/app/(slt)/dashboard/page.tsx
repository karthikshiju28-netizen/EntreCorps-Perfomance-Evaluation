import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FORMS } from '@/lib/forms';
import BarChartProjects from '@/components/BarChartProjects';
import CopyButton from '@/components/CopyButton';

type Score = {
  person_id: string; full_name: string; role: string; projects: string | null;
  self_score: number | null; manager_score: number | null; upward_score: number | null; slt_score: number | null;
  n_evals: number; composite: number | null;
};
type SP = { term?: string; round?: string; project?: string; role?: string; sort?: string; dir?: string };
const ROUNDS = ['All Rounds', 'Mid-term Evaluation', 'Final Evaluation'];
const f2 = (n: number | null) => (n == null ? '' : Number(n).toFixed(2));

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const { data: cycles } = await sb.from('cycles').select('id,term,round,is_open').order('term', { ascending: false });
  const terms = [...new Set((cycles ?? []).map((c) => c.term))];
  const open = (cycles ?? []).find((c) => c.is_open);
  const term = sp.term ?? open?.term ?? terms[0] ?? '';
  const round = sp.round ?? 'All Rounds';

  const { data: raw } = await sb.rpc('person_scores', { p_term: term || null, p_round: round });
  let rows = (raw ?? []) as Score[];
  const { data: projs } = await sb.from('projects').select('id,name,sort_order').eq('active', true).order('sort_order');
  const { data: asg } = await sb.from('assignments').select('person_id, project_id');
  const membersOf = (name: string) => {
    const id = (projs ?? []).find((p) => p.name === name)?.id;
    return new Set((asg ?? []).filter((a) => a.project_id === id).map((a) => a.person_id));
  };

  const all = rows;
  if (sp.project) { const m = membersOf(sp.project); rows = rows.filter((r) => m.has(r.person_id)); }
  if (sp.role) rows = rows.filter((r) => r.role === sp.role);
  const sort = (sp.sort ?? 'projects') as keyof Score;
  const dir = sp.dir === 'desc' ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const x = a[sort], y = b[sort];
    if (x == null && y == null) return 0;
    if (x == null) return 1; if (y == null) return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });

  const summary = (projs ?? []).map((p) => {
    const m = membersOf(p.name);
    const people = all.filter((r) => m.has(r.person_id));
    const comps = people.filter((r) => r.composite != null).map((r) => Number(r.composite));
    return { project: p.name, avg: comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null, people: m.size, withComp: comps.length };
  });

  // Completion tracker for the open round
  let comp: any[] = [];
  if (open) { const { data } = await sb.rpc('completion_status', { p_cycle: open.id }); comp = data ?? []; }
  const byProject = new Map<string, { done: number; total: number }>();
  comp.forEach((c) => { const e = byProject.get(c.project_name) ?? { done: 0, total: 0 }; e.total++; if (c.done) e.done++; byProject.set(c.project_name, e); });
  const owed = comp.filter((c) => !c.done);
  const reminder = [...new Map(owed.map((c) => [c.evaluator_id, `${c.evaluator_name} <${c.evaluator_email ?? ''}>`])).values()].join('\n');

  const qs = (o: Partial<SP>) => '?' + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  const th = (k: string, label: string) => (
    <th><Link className="hover:text-ink" href={qs({ sort: k, dir: sp.sort === k && sp.dir !== 'desc' ? 'desc' : 'asc' })}>{label}</Link></th>
  );

  return (
    <div className="flex flex-col gap-8">
      <header><p className="label">{term || 'No term'} · {round}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1></header>
      <form className="card flex flex-wrap items-center gap-2 p-3 text-sm" method="get">
        <select name="term" defaultValue={term} className="input w-auto">{terms.map((t) => <option key={t}>{t}</option>)}</select>
        <select name="round" defaultValue={round} className="input w-auto">{ROUNDS.map((r) => <option key={r}>{r}</option>)}</select>
        <select name="project" defaultValue={sp.project ?? ''} className="input w-auto">
          <option value="">All projects</option>{(projs ?? []).map((p) => <option key={p.id}>{p.name}</option>)}
        </select>
        <select name="role" defaultValue={sp.role ?? ''} className="input w-auto">
          <option value="">All roles</option><option>Project Manager</option><option>Senior Consultant</option><option>Consultant</option>
        </select>
        <button className="btn-primary">Apply</button>
      </form>

      {open && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Completion · {open.term} {open.round}</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {[...byProject].map(([n, v]) => (
              <li key={n} className="card p-4">
                <div className="flex items-baseline justify-between"><span className="font-semibold">{n}</span><span className="text-sm text-muted">{v.done} of {v.total}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-50"><div className="h-full rounded-full bg-accent" style={{ width: `${v.total ? (v.done / v.total) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
          <details className="card mt-3 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Who still owes what ({owed.length})</summary>
            <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto">
              {owed.map((c, i) => (
                <li key={i} className="py-1.5">{c.evaluator_name} → {c.evaluatee_name} ({FORMS[c.form_type as keyof typeof FORMS].title.replace('EntreCorps ', '')}, {c.project_name})</li>
              ))}
            </ul>
            <CopyButton text={reminder} label="Copy reminder list" />
          </details>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-bold uppercase tracking-wide text-navy">Scores</h2>
          <a className="btn-ghost min-h-9 text-xs" href={`/dashboard/export?kind=scores&term=${encodeURIComponent(term)}&round=${encodeURIComponent(round)}`}>Export scores CSV</a>
          <a className="btn-ghost min-h-9 text-xs" href={`/dashboard/export?kind=responses&term=${encodeURIComponent(term)}`}>Export responses CSV</a>
        </div>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr>
              {th('projects', 'Project')}{th('role', 'Role')}{th('full_name', 'Name')}{th('self_score', 'Self')}
              {th('manager_score', 'Manager')}{th('upward_score', 'Upward')}{th('slt_score', 'SLT')}{th('n_evals', '# Evals')}{th('composite', 'Composite')}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.person_id} className="hover:bg-canvas/50">
                  <td>{r.projects}</td><td>{r.role}</td>
                  <td><Link className="font-semibold text-navy hover:underline" href={`/dashboard/${r.person_id}${qs({})}`}>{r.full_name}</Link></td>
                  <td>{f2(r.self_score)}</td><td>{f2(r.manager_score)}</td>
                  <td>{f2(r.upward_score)}</td><td>{f2(r.slt_score)}</td>
                  <td>{r.n_evals}</td>
                  <td className={`font-bold ${r.composite != null && r.composite < 3 ? 'bg-warn-50 text-warn' : ''}`}>{f2(r.composite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Project summary</h2>
        <div className="grid gap-4 lg:grid-cols-2"><div className="card overflow-hidden"><table className="table">
          <thead><tr><th>Project</th><th>Avg Composite</th><th># People Scored</th><th># with a composite</th></tr></thead>
          <tbody>{summary.map((s) => (
            <tr key={s.project}><td>{s.project}</td><td>{f2(s.avg)}</td><td>{s.people}</td><td>{s.withComp}</td></tr>
          ))}</tbody>
        </table></div>
        <div className="card p-4"><BarChartProjects data={summary.map((s) => ({ project: s.project, avg: s.avg == null ? null : Number(s.avg.toFixed(2)) }))} /></div></div>
      </section>
    </div>
  );
}
