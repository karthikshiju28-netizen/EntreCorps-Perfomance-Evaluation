import { notFound } from 'next/navigation';
import { requirePerson } from '@/lib/session';
import { decodeTask } from '@/lib/form-schema';
import { FORMS } from '@/lib/forms';
import EvaluationForm from './EvaluationForm';

export default async function EvaluatePage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = decodeTask(taskId);
  if (!task) notFound();
  const { sb, person } = await requirePerson();
  const { data } = await sb.rpc('my_tasks');
  const t = (data ?? []).find((x: any) =>
    x.form_type === task.formType && x.project_id === task.projectId && x.evaluatee_id === task.evaluateeId);
  if (!t) notFound();

  let initial: Record<string, any> | null = null;
  if (t.evaluation_id) {
    const { data: ev } = await sb.from('evaluations')
      .select('technical,communication,reliability,teamwork,initiative,leadership,comment').eq('id', t.evaluation_id).single();
    initial = ev;
  }
  const { data: edits } = await sb.from('app_settings').select('value').eq('key', 'allow_edits_until_close').maybeSingle();
  const locked = !!t.evaluation_id && edits?.value !== 'true';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{FORMS[task.formType].title}</h1>
      <p className="text-sm text-gray-600">{FORMS[task.formType].description}</p>
      <EvaluationForm
        taskId={taskId} formType={task.formType} evaluatorName={person.full_name} evaluatorRole={person.role}
        projectName={t.project_name} evaluateeName={t.evaluatee_name} initial={initial} locked={locked}
      />
    </div>
  );
}
