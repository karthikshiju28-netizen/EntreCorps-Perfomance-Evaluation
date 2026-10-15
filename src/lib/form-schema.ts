import { z } from 'zod';
import { CORE } from './forms';

export type FormType = 'self' | 'manager' | 'upward' | 'slt';
export const FORM_TYPES: FormType[] = ['self', 'manager', 'upward', 'slt'];

const score = z.number().int().min(1).max(5);

export function schemaFor(formType: FormType, evaluatorRole?: string) {
  const core = Object.fromEntries(CORE.map((c) => [c.key, score]));
  const comment = z.string().trim().min(1, 'Comment is required');
  if (formType === 'manager') return z.object({ ...core, comment }).strict();
  if (formType === 'upward' || formType === 'slt') return z.object({ ...core, leadership: score, comment }).strict();
  const isLead = evaluatorRole === 'Project Manager' || evaluatorRole === 'Senior Consultant';
  return z.object({ ...core, ...(isLead ? { leadership: score.optional() } : {}), comment }).strict();
}

export const encodeTask = (f: FormType, project: string, evaluatee: string) => `${f}~${project}~${evaluatee}`;
export function decodeTask(id: string) {
  const [f, project, evaluatee] = decodeURIComponent(id).split('~');
  if (!FORM_TYPES.includes(f as FormType) || !project || !evaluatee) return null;
  return { formType: f as FormType, projectId: project, evaluateeId: evaluatee };
}
