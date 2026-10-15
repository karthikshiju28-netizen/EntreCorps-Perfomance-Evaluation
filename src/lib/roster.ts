export const ROLES = ['Project Manager', 'Senior Consultant', 'Consultant', 'SLT'] as const;
export type Role = (typeof ROLES)[number];
export type RosterRow = { name: string; email: string; role: Role; project: string };

// Minimal CSV parser (handles quoted fields). Header: name,email,role,project
export function parseRosterCsv(text: string): RosterRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const split = (l: string) => {
    const out: string[] = []; let cur = ''; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (k: string) => head.indexOf(k);
  if (['name', 'email', 'role', 'project'].some((k) => idx(k) < 0)) throw new Error('CSV header must be name,email,role,project');
  return lines.slice(1).map((l, n) => {
    const c = split(l);
    const role = c[idx('role')] as Role;
    if (!ROLES.includes(role)) throw new Error(`Row ${n + 2}: role must be one of ${ROLES.join(', ')}`);
    return { name: c[idx('name')], email: c[idx('email')].toLowerCase(), role, project: c[idx('project')] ?? '' };
  });
}
