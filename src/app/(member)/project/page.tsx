import { notFound } from 'next/navigation';
import { requirePerson } from '@/lib/session';
import { CORE, LEADERSHIP } from '@/lib/forms';

type Score = { project_id: string; project_name: string; person_id: string; full_name: string;
  self_score: number | null; manager_score: number | null; composite: number | null; n_evals: number };
type Review = { project_id: string; evaluatee_id: string; form_type: 'self' | 'manager'; evaluator_name: string;
  evaluator_role: string; technical: number; communication: number; reliability: number; teamwork: number;
  initiative: number; eval_avg: number; comment: string; submitted_at: string };
type Upward = { n: number; technical: number | null; communication: number | null; reliability: number | null;
  teamwork: number | null; initiative: number | null; leadership: number | null; overall: number | null; comments: string[] | null };

const f2 = (n: number | null | undefined) => (n == null ? '—' : Number(n).toFixed(2));
const MIN_UPWARD = 3;

export default async function MyProject() {
  const { sb, person } = await requirePerson();
  if (person.role !== 'Project Manager' && person.role !== 'Senior Consultant') notFound();

  const { data: cycleId } = await sb.rpc('current_or_latest_cycle');
  const { data: cycle } = cycleId
    ? await sb.from('cycles').select('term, round, is_open').eq('id', cycleId).single()
    : { data: null };
  const [{ data: scores }, { data: reviews }, { data: up }] = cycleId
    ? await Promise.all([
        sb.rpc('project_consultant_scores', { p_cycle: cycleId }),
        sb.rpc('project_consultant_reviews', { p_cycle: cycleId }),
        sb.rpc('my_upward_feedback', { p_cycle: cycleId }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const S = (scores ?? []) as Score[];
  const R = (reviews ?? []) as Review[];
  const U = ((up ?? []) as Upward[])[0];
  const projects = [...new Map(S.map((s) => [s.project_id, s.project_name])).entries()];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="label">{cycle ? `${cycle.term} · ${cycle.round}${cycle.is_open ? ' · live' : ''}` : 'No rounds yet'}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">My project</h1>
        <p className="mt-1 text-sm text-muted">How your consultants are doing, and anonymous feedback about you.</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Feedback about you</h2>
        <div className="card p-5">
          {!U || U.n < MIN_UPWARD ? (
            <p className="text-sm text-muted">
              {U?.n ?? 0} of your consultants {U?.n === 1 ? 'has' : 'have'} reviewed you so far. Results appear once at least {MIN_UPWARD} have, so no one can tell who said what.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-accent text-white">Overall {f2(U.overall)}</span>
                <span className="text-xs text-muted">from {U.n} consultants</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...CORE.map((c) => [c.label, U[c.key as keyof Upward]] as const), [LEADERSHIP, U.leadership] as const].map(([label, v]) => (
                  <div key={label} className="rounded-xl bg-canvas p-3">
                    <dt className="text-xs text-muted">{label.replace(' (1-5)', '')}</dt>
                    <dd className="mt-1 text-lg font-bold">{f2(v as number | null)}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-4 flex flex-col gap-2">
                {(U.comments ?? []).map((c, i) => (
                  <li key={i} className="rounded-xl border border-line p-3 text-sm leading-6">
                    <span className="mb-1 block text-xs font-semibold text-muted">Consultant</span>{c}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {projects.length === 0 && <p className="card px-4 py-6 text-sm text-muted">No consultants on your projects yet.</p>}

      {projects.map(([pid, pname]) => (
        <section key={pid}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">{pname} · consultants</h2>
          <div className="flex flex-col gap-3">
            {S.filter((s) => s.project_id === pid).map((s) => {
              const mine = R.filter((r) => r.project_id === pid && r.evaluatee_id === s.person_id);
              return (
                <details key={s.person_id} className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <span className="min-w-0 flex-1 font-semibold">{s.full_name}</span>
                    <span className="badge hidden bg-navy-50 text-navy sm:inline-flex">Self {f2(s.self_score)}</span>
                    <span className="badge hidden bg-navy-50 text-navy sm:inline-flex">Manager {f2(s.manager_score)}</span>
                    <span className={`badge ${s.composite != null && s.composite < 3 ? 'bg-warn-50 text-warn' : 'bg-accent text-white'}`}>
                      Composite {f2(s.composite)}
                    </span>
                    <span className="text-muted transition group-open:rotate-90">›</span>
                  </summary>
                  <div className="border-t border-line bg-canvas/40 p-4">
                    {mine.length === 0 ? (
                      <p className="text-sm text-muted">No reviews submitted yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {mine.map((r, i) => (
                          <li key={i} className="rounded-xl border border-line bg-white p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{r.form_type === 'self' ? 'Self-evaluation' : `Manager review · ${r.evaluator_name}`}</span>
                              <span className="badge bg-navy-50 text-navy">avg {f2(r.eval_avg)}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {CORE.map((c) => `${c.label.replace(' (1-5)', '')} ${r[c.key as keyof Review]}`).join(' · ')}
                            </p>
                            <p className="mt-2 leading-6">{r.comment}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
