export const CORE = [
  { key: 'technical',     label: 'Technical & Analytical Quality (1-5)' },
  { key: 'communication', label: 'Communication (1-5)' },
  { key: 'reliability',   label: 'Reliability & Ownership (1-5)' },
  { key: 'teamwork',      label: 'Teamwork & Collaboration (1-5)' },
  { key: 'initiative',    label: 'Initiative (1-5)' },
] as const;

export const LEADERSHIP = 'Leadership & Mentorship (1-5)';
export const LEADERSHIP_SELF = 'Leadership & Mentorship (1-5) (PM/SC only - others skip)';

export const SCALE = { min: 1, max: 5, minLabel: 'Needs Improvement', maxLabel: 'Excellent' };

export const COMMENT_SELF =
  'Comments (Provide a 3-4 line explanation of your performance so far. ' +
  'If you indicated a low score (1-3) on any of the metrics, provide an explanation of why.)';
export const COMMENT_OTHER =
  'Comments (Provide a 3-4 line explanation of their performance so far. ' +
  'If you indicated a low score (1-3) on any of the metrics, provide an explanation of why.)';

export const FORMS = {
  self: {
    title: 'EntreCorps Self-Evaluation',
    description: 'Rate your own performance this cycle.',
  },
  manager: {
    title: 'EntreCorps Manager Evaluation (PM & SC rating Consultants)',
    description: "For Project Managers and Senior Consultants. Submit once for EACH consultant you're evaluating.",
  },
  upward: {
    title: 'EntreCorps Upward Evaluation',
    description: 'For Consultants. Submit once for your Project Manager, once for your Senior Consultant.',
  },
  slt: {
    title: 'EntreCorps SLT Evaluation',
    description: "For SLT members. Submit once for each Project Manager / Senior Consultant you're evaluating.",
  },
} as const;

// Added Fall 2026 (not in the original Google Forms): optional short answer on every form.
export const SUPPORT_QUESTION = 'What can EntreCorps leadership help you with the most?';
