// Usage: npx tsx --env-file=.env.local scripts/seed-roster.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { parseRosterCsv } from '../src/lib/roster';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
const sb = createClient(url, key);

async function main() {
  const rows = parseRosterCsv(readFileSync('seed/roster.csv', 'utf8'));
  const projNames = [...new Set(rows.map((r) => r.project).filter(Boolean))].sort();
  for (const [i, name] of projNames.entries()) {
    const { error } = await sb.from('projects').upsert({ name, sort_order: i + 1 }, { onConflict: 'name' });
    if (error) throw error;
  }
  const { data: projs } = await sb.from('projects').select('id,name');
  const pid = new Map(projs!.map((p) => [p.name, p.id]));
  for (const r of rows) {
    let { data: pe } = await sb.from('person_emails').select('person_id').eq('email', r.email).maybeSingle();
    let personId = pe?.person_id as string | undefined;
    if (!personId) {
      const { data, error } = await sb.from('people').insert({ full_name: r.name, role: r.role }).select('id').single();
      if (error) throw error;
      personId = data.id;
      const e2 = await sb.from('person_emails').insert({ email: r.email, person_id: personId });
      if (e2.error) throw e2.error;
    } else {
      await sb.from('people').update({ full_name: r.name, role: r.role, active: true }).eq('id', personId);
    }
    if (r.project) {
      const { error } = await sb.from('assignments').upsert({ person_id: personId, project_id: pid.get(r.project)! });
      if (error) throw error;
    }
  }
  await sb.from('cycles').upsert({ term: 'Test', round: 'Mid-term Evaluation', is_open: false }, { onConflict: 'term,round' });
  console.log(`Seeded ${rows.length} roster rows.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
