import Link from 'next/link';
import { FORMS } from '@/lib/forms';
import { encodeTask, FORM_TYPES, type FormType } from '@/lib/form-schema';

export type Task = {
  form_type: FormType; project_id: string; project_name: string; evaluatee_id: string;
  evaluatee_name: string; evaluatee_role: string; evaluation_id: string | null; submitted_at: string | null;
};

const SECTION: Record<FormType, string> = { self: 'Self', manager: 'Manager', upward: 'Upward', slt: 'SLT' };
const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');

function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-navy-50" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className={pct === 1 ? 'text-good' : 'text-accent'} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold">{Math.round(pct * 100)}%</span>
    </div>
  );
}

export function MyEvaluations({ person, projects, cycle, tasks: all, project, saved }: {
  person: { full_name: string; role: string };
  projects: { id: string; name: string }[];
  cycle: { term: string; round: string; closes_at: string | null } | null;
  tasks: Task[];
  project?: string;
  saved?: boolean;
}) {
  let tasks = all;
  const total = tasks.length;
  const done = tasks.filter((t) => t.evaluation_id).length;
  if (project) tasks = tasks.filter((t) => t.project_id === project);
  const first = person.full_name.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-good/20 bg-good-50 px-4 py-3 text-sm font-medium text-good">
          <span aria-hidden>✓</span> Saved. Back to my evaluations
        </div>
      )}

      <section className="card flex items-center gap-5 p-6">
        <div className="min-w-0 flex-1">
          <p className="label">{cycle ? `${cycle.term} · ${cycle.round}` : 'No open round'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Hi, {first}</h1>
          <p className="mt-1 text-sm text-muted">
            {person.role}{projects.length ? ' · ' + projects.map((p) => p.name).join(', ') : ''}
          </p>
          {cycle?.closes_at && (
            <p className="mt-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
              Due {new Date(cycle.closes_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        {cycle && total > 0 && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-2xl font-bold">{done}<span className="text-muted">/{total}</span></div>
              <div className="text-xs text-muted">done</div>
            </div>
            <Ring done={done} total={total} />
          </div>
        )}
      </section>

      {!cycle ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-navy-50 text-xl">☕</div>
          <p className="font-semibold">No evaluation round is open right now.</p>
          <p className="text-sm text-muted">You&apos;ll see your list here as soon as SLT opens one.</p>
        </div>
      ) : total === 0 ? (
        <div className="card px-6 py-14 text-center text-sm text-muted">Nothing assigned to you this round.</div>
      ) : (
        <>
          {projects.length > 1 && (
            <nav className="flex flex-wrap gap-2 text-sm">
              {[{ id: '', name: 'All projects' }, ...projects].map((p) => {
                const on = (project ?? '') === p.id;
                return (
                  <Link key={p.id || 'all'} href={p.id ? `/?project=${p.id}` : '/'}
                    className={`rounded-full px-4 py-1.5 font-medium transition ${on ? 'bg-navy text-white' : 'border border-line bg-white text-muted hover:text-ink'}`}>
                    {p.name}
                  </Link>
                );
              })}
            </nav>
          )}
          {FORM_TYPES.map((f) => {
            const rows = tasks.filter((t) => t.form_type === f);
            if (!rows.length) return null;
            const left = rows.filter((r) => !r.evaluation_id).length;
            return (
              <section key={f}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-navy">{SECTION[f]}</h2>
                  <span className="text-xs text-muted">{left ? `${left} to go` : 'All done'}</span>
                </div>
                <ul className="card divide-y divide-line overflow-hidden">
                  {rows.map((t) => (
                    <li key={t.project_id + t.evaluatee_id}>
                      <Link href={`/evaluate/${encodeURIComponent(encodeTask(f, t.project_id, t.evaluatee_id))}`}
                        className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-canvas/60">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${t.evaluation_id ? 'bg-good-50 text-good' : 'bg-navy-50 text-navy'}`}>
                          {t.evaluation_id ? '✓' : initials(t.evaluatee_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{t.evaluatee_name}{f === 'self' && ' (you)'}</span>
                          <span className="block truncate text-xs text-muted">{t.evaluatee_role} · {t.project_name}</span>
                        </span>
                        {t.submitted_at ? (
                          <span className="badge hidden bg-good-50 text-good sm:inline-flex">
                            Submitted {new Date(t.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="badge hidden bg-canvas text-muted sm:inline-flex">Not started</span>
                        )}
                        <span className={`text-sm font-semibold ${t.evaluation_id ? 'text-muted' : 'text-accent'} group-hover:translate-x-0.5 transition`}>
                          {t.evaluation_id ? 'Edit' : 'Start'} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 px-1 text-xs text-muted">{FORMS[f].description}</p>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
