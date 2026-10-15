'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CORE, LEADERSHIP, LEADERSHIP_SELF, SCALE, COMMENT_SELF, COMMENT_OTHER } from '@/lib/forms';
import { schemaFor, type FormType } from '@/lib/form-schema';
import { submitEvaluation } from './actions';

type Answers = Record<string, number | string | undefined>;

function Scale({ label, value, onChange }: { label: string; value?: number; onChange: (n: number) => void }) {
  return (
    <fieldset className="rounded border bg-white p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => onChange(n)} aria-pressed={value === n}
            className={`min-h-11 rounded border text-sm ${value === n ? 'bg-blue-700 text-white' : 'bg-white'}`}>{n}</button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-600">
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

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded border bg-white p-3 text-sm">
        <dt className="text-gray-600">{p.formType === 'self' ? 'Your name (First, Last)' : 'Your name (First, Last) / Your role'}</dt>
        <dd>{p.evaluatorName}{p.formType === 'self' ? '' : ` / ${p.evaluatorRole}`}</dd>
        {p.formType === 'self' && (<><dt className="text-gray-600">Your role</dt><dd>{p.evaluatorRole}</dd></>)}
        <dt className="text-gray-600">{p.formType === 'self' ? 'Which project are you on?' : 'Which project is this about?'}</dt>
        <dd>{p.projectName}</dd>
        {p.formType !== 'self' && (
          <>
            <dt className="text-gray-600">{p.formType === 'manager' ? 'Which consultant are you evaluating?' : 'Who are you evaluating?'}</dt>
            <dd>{p.evaluateeName}</dd>
          </>
        )}
      </dl>

      {CORE.map((c) => (
        <Scale key={c.key} label={c.label} value={a[c.key] as number | undefined} onChange={(n) => setA({ ...a, [c.key]: n })} />
      ))}
      {showLeadership && (
        <Scale label={p.formType === 'self' ? LEADERSHIP_SELF : LEADERSHIP} value={a.leadership as number | undefined}
          onChange={(n) => setA({ ...a, leadership: n })} />
      )}
      <label className="flex flex-col gap-2 rounded border bg-white p-3 text-sm font-medium">
        {p.formType === 'self' ? COMMENT_SELF : COMMENT_OTHER}
        <textarea rows={5} value={(a.comment as string) ?? ''} onChange={(e) => setA({ ...a, comment: e.target.value })}
          className="rounded border p-2 font-normal" />
      </label>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button disabled={!valid || busy || p.locked} className="min-h-11 rounded bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-40">
        {p.initial ? 'Update' : 'Submit'}
      </button>
    </form>
  );
}
