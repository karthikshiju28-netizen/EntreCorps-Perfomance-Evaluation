'use server';
import { requirePerson } from '@/lib/session';
import { decodeTask, schemaFor } from '@/lib/form-schema';

export async function submitEvaluation(taskId: string, raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const task = decodeTask(taskId);
  if (!task) return { ok: false, error: 'Unknown task.' };
  const { sb, person } = await requirePerson();
  const parsed = schemaFor(task.formType, person.role).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid answers.' };

  const { data: tasks } = await sb.rpc('my_tasks');
  const t = (tasks ?? []).find((x: any) =>
    x.form_type === task.formType && x.project_id === task.projectId && x.evaluatee_id === task.evaluateeId);
  if (!t) return { ok: false, error: 'This evaluation is not on your list (or no round is open).' };
  const { data: cycle } = await sb.from('cycles').select('id').eq('is_open', true).maybeSingle();
  if (!cycle) return { ok: false, error: 'No round is open.' };

  const row = {
    cycle_id: cycle.id, form_type: task.formType, project_id: task.projectId,
    evaluator_id: person.id, evaluatee_id: task.evaluateeId,
    evaluator_role: person.role, evaluatee_role: t.evaluatee_role, // overwritten by trigger
    leadership: null as number | null,
    ...parsed.data,
  };
  const { error } = await sb.from('evaluations')
    .upsert(row, { onConflict: 'cycle_id,form_type,evaluator_id,evaluatee_id,project_id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
