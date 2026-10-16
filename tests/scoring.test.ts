import { describe, expect, it } from 'vitest';
import { avgOf, composite, mean } from '../src/lib/scoring';
import { schemaFor, decodeTask, encodeTask } from '../src/lib/form-schema';
import { parseRosterCsv } from '../src/lib/roster';

const consultant = { self: 25, manager: 60, upward: 0, slt: 15 };

describe('scoring', () => {
  it('eval avg ignores blanks', () => {
    expect(avgOf([5, 4, 3, 4, 4, null])).toBeCloseTo(4);
    expect(avgOf([5, 4, 3, 4, 4, 4])).toBeCloseTo(4);
  });
  it('worked check: 3.98 with all components', () => {
    const s = { self: 4.4, manager: mean([3.6, 4.0]), upward: null, slt: 4.0 };
    expect(composite(s, consultant)).toBeCloseTo(3.98, 2);
  });
  it('renormalizes without SLT, blank under require_all', () => {
    const s = { self: 4.4, manager: 3.8, upward: null, slt: null };
    expect(composite(s, consultant)).toBeCloseTo(3.976, 3);
    expect(composite(s, consultant, 'require_all')).toBeNull();
  });
});

describe('forms', () => {
  const core = { technical: 3, communication: 3, reliability: 3, teamwork: 3, initiative: 3, comment: 'ok' };
  it('manager rejects leadership', () => expect(schemaFor('manager').safeParse({ ...core, leadership: 3 }).success).toBe(false));
  it('upward requires leadership', () => {
    expect(schemaFor('upward').safeParse(core).success).toBe(false);
    expect(schemaFor('upward').safeParse({ ...core, leadership: 4 }).success).toBe(true);
  });
  it('self leadership optional for PM, not accepted for consultant', () => {
    expect(schemaFor('self', 'Project Manager').safeParse(core).success).toBe(true);
    expect(schemaFor('self', 'Consultant').safeParse({ ...core, leadership: 3 }).success).toBe(false);
  });
  it('support question is optional on every form', () => {
    for (const f of ['self', 'manager', 'upward', 'slt'] as const) {
      const base = { ...core, ...(f === 'upward' || f === 'slt' ? { leadership: 4 } : {}) };
      expect(schemaFor(f, 'Consultant').safeParse(base).success).toBe(true);
      expect(schemaFor(f, 'Consultant').safeParse({ ...base, leadership_support: 'More client exposure' }).success).toBe(true);
    }
  });
  it('comment required', () => expect(schemaFor('manager').safeParse({ ...core, comment: '  ' }).success).toBe(false));
  it('task ids round-trip', () => expect(decodeTask(encodeTask('upward', 'p', 'e'))).toEqual({ formType: 'upward', projectId: 'p', evaluateeId: 'e' }));
});

describe('roster csv', () => {
  it('parses and validates roles', () => {
    expect(parseRosterCsv('name,email,role,project\nA B,A@illinois.edu,SLT,\n')[0]).toEqual({ name: 'A B', email: 'a@illinois.edu', role: 'SLT', project: '' });
    expect(() => parseRosterCsv('name,email,role,project\nA,a@x.edu,Boss,P1')).toThrow();
  });
});
