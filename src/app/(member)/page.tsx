import Link from 'next/link';
import { requirePerson } from '@/lib/session';
import { FORMS } from '@/lib/forms';
import { encodeTask, FORM_TYPES, type FormType } from '@/lib/form-schema';

type Task = {
  form_type: FormType; project_id: string; project_name: string; evaluatee_id: string;
  evaluatee_name: string; evaluatee_role: string; evaluation_id: string | null; submitted_at: string | null;
};

export default async function Home({ searchParams }: { searchParams: Promise<{ project?: string; saved?: string }> }) {
  const { sb, person, projects } = await requirePerson();
  const { project, saved } = await searchParams;
  const { data: cycle } = await sb.from('cycles').select('term, round, closes_at').eq('is_open', true).maybeSingle();
  const { data } = await sb.rpc('my_tasks');
  let tasks = (data ?? []) as Task[];
  const total = tasks.length;
  const done = tasks.filter((t) => t.evaluation_id).length;
  if (project) tasks = tasks.filter((t) => t.project_id === project);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-semibold">{person.full_name}</h1>
        <p className="text-sm text-gray-600">
          {person.role}{projects.length ? ' · ' + projects.map((p) => p.name).join(', ') : ''}
        </p>
        {cycle && (
          <p className="mt-1 text-sm">
            {cycle.term} · {cycle.round}
            {cycle.closes_at && ` · closes ${new Date(cycle.closes_at).toLocaleDateString()}`}
          </p>
        )}
      </section>

      {saved && <p className="rounded bg-green-50 p-3 text-sm text-green-800">Saved. Back to my evaluations</p>}
      {!cycle ? (
        <p className="rounded bg-white p-4">No evaluation round is open right now.</p>
      ) : (
        <>
          <div>
            <div className="mb-1 text-sm">{done} of {total} done</div>
            <div className="h-2 rounded bg-gray-200">
              <div className="h-2 rounded bg-blue-700" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
            </div>
          </div>
          {projects.length > 1 && (
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link href="/" className={`rounded border px-3 py-1 ${!project ? 'bg-blue-700 text-white' : 'bg-white'}`}>All</Link>
              {projects.map((p) => (
                <Link key={p.id} href={`/?project=${p.id}`}
                  className={`rounded border px-3 py-1 ${project === p.id ? 'bg-blue-700 text-white' : 'bg-white'}`}>{p.name}</Link>
              ))}
            </nav>
          )}
          {FORM_TYPES.map((f) => {
            const rows = tasks.filter((t) => t.form_type === f);
            if (!rows.length) return null;
            return (
              <section key={f}>
                <h2 className="mb-2 font-semibold">{FORMS[f].title}</h2>
                <ul className="divide-y rounded border bg-white">
                  {rows.map((t) => (
                    <li key={t.project_id + t.evaluatee_id} className="flex items-center gap-3 p-3">
                      <div className="flex-1">
                        <div className="font-medium">{t.evaluatee_name}</div>
                        <div className="text-xs text-gray-600">{t.evaluatee_role} · {t.project_name}</div>
                      </div>
                      <span className={`text-xs ${t.evaluation_id ? 'text-green-700' : 'text-gray-500'}`}>
                        {t.submitted_at ? `✓ Submitted on ${new Date(t.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Not started'}
                      </span>
                      <Link href={`/evaluate/${encodeURIComponent(encodeTask(f, t.project_id, t.evaluatee_id))}`}
                        className="min-h-11 rounded bg-blue-700 px-4 py-2 text-sm text-white">
                        {t.evaluation_id ? 'Edit' : 'Start'}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
