'use server';
import { revalidatePath } from 'next/cache';
import { requireSlt } from '@/lib/session';
import { parseRosterCsv } from '@/lib/roster';

type R = { ok: boolean; message: string };
const done = (message: string, ok = true): R => { revalidatePath('/admin'); return { ok, message }; };

export async function importRoster(_: R | null, fd: FormData): Promise<R> {
  const { sb } = await requireSlt();
  const file = fd.get('csv') as File | null;
  if (!file || !file.size) return { ok: false, message: 'Choose a CSV file.' };
  let rows;
  try { rows = parseRosterCsv(await file.text()); } catch (e: any) { return { ok: false, message: e.message }; }
  const names = [...new Set(rows.map((r) => r.project).filter(Boolean))];
  const { data: existing } = await sb.from('projects').select('id,name,sort_order');
  let next = (existing ?? []).reduce((m, p) => Math.max(m, p.sort_order), 0);
  for (const n of names) if (!existing?.some((p) => p.name === n)) {
    const { error } = await sb.from('projects').insert({ name: n, sort_order: ++next });
    if (error) return { ok: false, message: error.message };
  }
  const { data: projs } = await sb.from('projects').select('id,name');
  const pid = new Map((projs ?? []).map((p) => [p.name, p.id]));
  for (const r of rows) {
    const { data: pe } = await sb.from('person_emails').select('person_id').eq('email', r.email).maybeSingle();
    let id = pe?.person_id as string | undefined;
    if (id) await sb.from('people').update({ full_name: r.name, role: r.role, active: true }).eq('id', id);
    else {
      const { data, error } = await sb.from('people').insert({ full_name: r.name, role: r.role }).select('id').single();
      if (error) return { ok: false, message: error.message };
      id = data.id;
      const e2 = await sb.from('person_emails').insert({ email: r.email, person_id: id });
      if (e2.error) return { ok: false, message: e2.error.message };
    }
    if (r.project) await sb.from('assignments').upsert({ person_id: id, project_id: pid.get(r.project)! });
  }
  return done(`Imported ${rows.length} rows.`);
}

export async function setPersonActive(fd: FormData) {
  const { sb } = await requireSlt();
  await sb.from('people').update({ active: fd.get('active') === 'true' }).eq('id', fd.get('id') as string);
  revalidatePath('/admin');
}

export async function addProject(fd: FormData) {
  const { sb } = await requireSlt();
  const name = String(fd.get('name') ?? '').trim();
  if (!name) return;
  const { data } = await sb.from('projects').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  await sb.from('projects').insert({ name, sort_order: (data?.[0]?.sort_order ?? 0) + 1 });
  revalidatePath('/admin');
}
export async function setProjectActive(fd: FormData) {
  const { sb } = await requireSlt();
  await sb.from('projects').update({ active: fd.get('active') === 'true' }).eq('id', fd.get('id') as string);
  revalidatePath('/admin');
}

export async function createCycle(fd: FormData) {
  const { sb } = await requireSlt();
  const closes = String(fd.get('closes_at') ?? '');
  await sb.from('cycles').insert({
    term: String(fd.get('term')).trim(), round: fd.get('round') as string, closes_at: closes ? new Date(closes).toISOString() : null,
  });
  revalidatePath('/admin');
}
export async function setCycleOpen(fd: FormData) {
  const { sb } = await requireSlt();
  const id = fd.get('id') as string;
  if (fd.get('open') === 'true') await sb.from('cycles').update({ is_open: false }).eq('is_open', true);
  await sb.from('cycles').update({ is_open: fd.get('open') === 'true' }).eq('id', id);
  revalidatePath('/admin');
}
export async function deleteCycleEvaluations(fd: FormData) {
  const { sb } = await requireSlt();
  await sb.from('evaluations').delete().eq('cycle_id', fd.get('id') as string);
  revalidatePath('/admin');
}

export async function saveWeights(_: R | null, fd: FormData): Promise<R> {
  const { sb } = await requireSlt();
  const comps = ['Self', 'Manager', 'Upward', 'SLT'];
  const rows = comps.map((c) => ({ component: c, consultant_pct: Number(fd.get(`c_${c}`)), pm_sc_pct: Number(fd.get(`l_${c}`)) }));
  const sum = (k: 'consultant_pct' | 'pm_sc_pct') => rows.reduce((a, r) => a + r[k], 0);
  if (sum('consultant_pct') !== 100 || sum('pm_sc_pct') !== 100) return { ok: false, message: 'Each column must total 100.' };
  const { error } = await sb.from('weights').upsert(rows);
  return error ? { ok: false, message: error.message } : done('Weights saved.');
}

export async function saveSettings(fd: FormData) {
  const { sb } = await requireSlt();
  const rows = [
    { key: 'allowed_email_domain', value: String(fd.get('allowed_email_domain') ?? '').trim() },
    { key: 'allow_edits_until_close', value: fd.get('allow_edits_until_close') ? 'true' : 'false' },
    { key: 'pm_sc_peer_reviews', value: fd.get('pm_sc_peer_reviews') ? 'true' : 'false' },
    { key: 'composite_missing', value: fd.get('composite_missing') === 'require_all' ? 'require_all' : 'renormalize' },
  ];
  await sb.from('app_settings').upsert(rows);
  revalidatePath('/admin');
}

// One-time import of the old RESPONSES tab (15 columns). Exact-name matching; nothing is guessed.
export async function importResponses(_: R | null, fd: FormData): Promise<R> {
  const { sb } = await requireSlt();
  const file = fd.get('csv') as File | null;
  const term = String(fd.get('term') ?? '').trim();
  if (!file || !file.size || !term) return { ok: false, message: 'Choose a CSV and enter the term.' };
  const lines = (await file.text()).replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const split = (l: string) => { const o: string[] = []; let c = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i];
      if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; }
    o.push(c); return o; };
  const head = split(lines[0]);
  const rec = lines.slice(1).join('\n') && lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
  const [{ data: people }, { data: projs }, { data: cycles }] = await Promise.all([
    sb.from('people').select('id,full_name'), sb.from('projects').select('id,name'), sb.from('cycles').select('id,term,round')]);
  const pn = new Map((people ?? []).map((p) => [p.full_name, p.id]));
  const pr = new Map((projs ?? []).map((p) => [p.name, p.id]));
  const unmatched: string[] = []; let ok = 0;
  for (const r of rec as Record<string, string>[]) {
    const cyc = (cycles ?? []).find((c) => c.term === term && c.round === r['Round']);
    const ev = pn.get(r['Evaluator Name']), ee = pn.get(r['Evaluatee Name']), p = pr.get(r['Project']);
    if (!cyc || !ev || !ee || !p) { unmatched.push(`${r['Evaluator Name']} → ${r['Evaluatee Name']} (${r['Project']}, ${r['Round']})`); continue; }
    const role = r['Evaluator Role'];
    const form = ev === ee ? 'self' : role === 'SLT' ? 'slt' : role === 'Consultant' ? 'upward' : r['Leadership'] ? 'upward' : 'manager';
    const n = (k: string) => (r[k] === '' || r[k] == null ? null : Number(r[k]));
    const { error } = await sb.from('evaluations').upsert({
      cycle_id: cyc.id, form_type: form, project_id: p, evaluator_id: ev, evaluatee_id: ee,
      evaluator_role: role, evaluatee_role: r['Evaluatee Role'],
      technical: n('Technical'), communication: n('Communication'), reliability: n('Reliability'),
      teamwork: n('Teamwork'), initiative: n('Initiative'), leadership: n('Leadership'), comment: r['Comment'] || '-',
      submitted_at: r['Timestamp'] ? new Date(r['Timestamp']).toISOString() : undefined,
    }, { onConflict: 'cycle_id,form_type,evaluator_id,evaluatee_id,project_id' });
    if (error) unmatched.push(`${r['Evaluator Name']} → ${r['Evaluatee Name']}: ${error.message}`); else ok++;
  }
  return done(`Imported ${ok}. Unmatched/failed (${unmatched.length}):\n${unmatched.join('\n')}`, unmatched.length === 0);
}
