'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CORE, LEADERSHIP, LEADERSHIP_SELF, SCALE, COMMENT_SELF, COMMENT_OTHER } from '@/lib/forms';
import { schemaFor, type FormType } from '@/lib/form-schema';
import { submitEvaluation } from './actions';

type Answers = Record<string, number | string | undefined>;

function Scale({ n, label, value, onChange, optional }: { n: number; label: string; value?: number; onChange: (n: number) => void; optional?: boolean }) {
  return (
    <fieldset className="card p-5">
      <legend className="sr-only">{label}</legend>
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${value ? 'bg-navy text-white' : 'bg-navy-50 text-navy'}`}>{n}</span>
        <p className="pt-0.5 font-semibold leading-snug">
          {label}{!optional && <span className="ml-1 text-accent">*</span>}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((v) => {
          const on = value === v;
          return (
            <button type="button" key={v} onClick={() => onChange(v)} aria-pressed={on}
              className={`min-h-12 rounded-xl border text-base font-bold transition ${on
                ? 'border-navy bg-navy text-white shadow-md shadow-navy/20'
                : 'border-line bg-white text-ink hover:border-navy/40 hover:bg-navy-50'}`}>{v}</button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-muted">
        <span>{SCALE.minLabel}</span><span>{SCALE.maxLabel}</span>
      </div>
    </fieldset>
  );
}

export default function EvaluationForm(p: {
  taskId: string; formType: FormType; evaluatorName: string; evaluatorRole: string;
  projectName: string; evaluateeName: string; initial: Answers | null; locked: boolean;
}) {
  const router = useRouter();
  const key = `draft:${p.taskId}`;
  const [a, setA] = useState<Answers>(() => (p.initial ? { ...p.initial } : {}));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (p.initial) return;
    try { const d = localStorage.getItem(key); if (d) setA(JSON.parse(d)); } catch {}
  }, [key, p.initial]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(a)); } catch {} }, [a, key]);

  const isLeadSelf = p.formType === 'self' && ['Project Manager', 'Senior Consultant'].includes(p.evaluatorRole);
  const showLeadership = p.formType === 'upward' || p.formType === 'slt' || isLeadSelf;
  const payload = useMemo(() => {
    const o: Record<string, unknown> = {};
    CORE.forEach((c) => (o[c.key] = a[c.key]));
    if (showLeadership && a.leadership != null) o.leadership = a.leadership;
    o.comment = a.comment ?? '';
    return o;
  }, [a, showLeadership]);
  const valid = useMemo(() => schemaFor(p.formType, p.evaluatorRole).safeParse(payload).success, [payload, p.formType, p.evaluatorRole]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await submitEvaluation(p.taskId, payload);
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not save.');
    try { localStorage.removeItem(key); } catch {}
    router.push('/?saved=1');
    router.refresh();
  }

  const answered = CORE.filter((c) => a[c.key] != null).length + (showLeadership && a.leadership != null ? 1 : 0);
  const totalQ = CORE.length + (showLeadership ? 1 : 0);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-28">
      <dl className="card grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="label">{p.formType === 'self' ? 'Your name (First, Last)' : 'Your name (First, Last) / Your role'}</dt>
          <dd className="mt-1 font-semibold">{p.evaluatorName}{p.formType === 'self' ? '' : ` / ${p.evaluatorRole}`}</dd>
        </div>
        {p.formType === 'self' && (
          <div><dt className="label">Your role</dt><dd className="mt-1 font-semibold">{p.evaluatorRole}</dd></div>
        )}
        <div>
          <dt className="label">{p.formType === 'self' ? 'Which project are you on?' : 'Which project is this about?'}</dt>
          <dd className="mt-1 font-semibold">{p.projectName}</dd>
        </div>
        {p.formType !== 'self' && (
          <div>
            <dt className="label">{p.formType === 'manager' ? 'Which consultant are you evaluating?' : 'Who are you evaluating?'}</dt>
            <dd className="mt-1 font-semibold">{p.evaluateeName}</dd>
          </div>
        )}
      </dl>

      {CORE.map((c, i) => (
        <Scale key={c.key} n={i + 1} label={c.label} value={a[c.key] as number | undefined} onChange={(n) => setA({ ...a, [c.key]: n })} />
      ))}
      {showLeadership && (
        <Scale n={CORE.length + 1} label={p.formType === 'self' ? LEADERSHIP_SELF : LEADERSHIP} optional={p.formType === 'self'}
          value={a.leadership as number | undefined} onChange={(n) => setA({ ...a, leadership: n })} />
      )}
      <label className="card flex flex-col gap-3 p-5">
        <span className="font-semibold leading-snug">
          {p.formType === 'self' ? COMMENT_SELF : COMMENT_OTHER}<span className="ml-1 text-accent">*</span>
        </span>
        <textarea rows={5} value={(a.comment as string) ?? ''} onChange={(e) => setA({ ...a, comment: e.target.value })}
          className="input min-h-32 py-3 leading-6" placeholder="Write 3-4 lines..." />
      </label>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-muted">{answered} of {totalQ} ratings{(a.comment as string)?.trim() ? ' · comment added' : ''}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-50">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(answered / totalQ) * 100}%` }} />
            </div>
            {err && <p className="mt-1 text-xs font-medium text-warn">{err}</p>}
          </div>
          <button disabled={!valid || busy || p.locked} className="btn-accent px-6">
            {busy ? 'Saving…' : p.initial ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
    </form>
  );
}
