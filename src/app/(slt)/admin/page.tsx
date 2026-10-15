import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import {
  importRoster, setPersonActive, addProject, setProjectActive, createCycle, setCycleOpen,
  deleteCycleEvaluations, saveWeights, saveSettings, importResponses,
} from './actions';

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">{children}</h2>;
const Box = ({ children }: { children: React.ReactNode }) => <section className="card p-6">{children}</section>;

export default async function Admin() {
  const sb = await createClient();
  const [{ data: people }, { data: emails }, { data: asg }, { data: projs }, { data: cycles }, { data: weights }, { data: settings }] =
    await Promise.all([
      sb.from('people').select('*').order('full_name'), sb.from('person_emails').select('email,person_id'),
      sb.from('assignments').select('person_id, projects(name)'), sb.from('projects').select('*').order('sort_order'),
      sb.from('cycles').select('*').order('term', { ascending: false }), sb.from('weights').select('*'),
      sb.from('app_settings').select('*')]);
  const S = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const W = (c: string, k: 'consultant_pct' | 'pm_sc_pct') => weights?.find((w) => w.component === c)?.[k] ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header><p className="label">SLT only</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Admin</h1></header>

      <Box><H>Roster</H>
        <ActionForm action={importRoster} submit="Import CSV">
          <p className="text-sm text-muted">Columns: name,email,role,project (upserts by email).</p>
          <input type="file" name="csv" accept=".csv" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:font-semibold file:text-navy" />
        </ActionForm>
        <div className="mt-5 overflow-x-auto rounded-xl border border-line"><table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Emails</th><th>Projects</th><th>Active</th></tr></thead>
          <tbody>{(people ?? []).map((p) => (
            <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
              <td className="font-semibold">{p.full_name}</td><td>{p.role}</td>
              <td>{emails?.filter((e) => e.person_id === p.id).map((e) => e.email).join(', ')}</td>
              <td>{asg?.filter((a) => a.person_id === p.id).map((a: any) => a.projects?.name).join(', ')}</td>
              <td><form action={setPersonActive}>
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
                <button className="text-xs font-semibold text-navy hover:underline">{p.active ? 'Deactivate' : 'Activate'}</button></form></td>
            </tr>))}</tbody></table></div>
      </Box>

      <Box><H>Projects</H>
        <ul className="mb-4 flex flex-col divide-y divide-line rounded-xl border border-line text-sm">{(projs ?? []).map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">{p.name} {!p.active && '(inactive)'}
            <form action={setProjectActive}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
              <button className="text-xs font-semibold text-navy hover:underline">{p.active ? 'Deactivate' : 'Activate'}</button></form></li>))}</ul>
        <form action={addProject} className="flex gap-2"><input name="name" placeholder="Project 7" className="input w-auto" required />
          <button className="btn-primary">Add</button></form>
      </Box>

      <Box><H>Rounds</H>
        <ul className="mb-4 flex flex-col divide-y divide-line rounded-xl border border-line text-sm">{(cycles ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span>{c.term} · {c.round} {c.is_open && <span className="badge bg-good-50 text-good">Open</span>}</span>
            <form action={setCycleOpen}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="open" value={String(!c.is_open)} />
              <button className="text-xs font-semibold text-navy hover:underline">{c.is_open ? 'Close' : 'Open'}</button></form>
            <form action={deleteCycleEvaluations}><input type="hidden" name="id" value={c.id} />
              <button className="text-xs font-semibold text-warn hover:underline">Delete this round&apos;s evaluations</button></form>
          </li>))}</ul>
        <form action={createCycle} className="flex flex-wrap gap-2 text-sm">
          <input name="term" placeholder="Fall 2026" required className="input w-auto" />
          <select name="round" className="input w-auto"><option>Mid-term Evaluation</option><option>Final Evaluation</option></select>
          <input type="date" name="closes_at" className="input w-auto" />
          <button className="btn-primary">Create round</button></form>
      </Box>

      <Box><H>Weights</H>
        <ActionForm action={saveWeights} submit="Save weights">
          <table className="text-sm"><thead><tr><th className="p-1 text-left">Component</th><th className="p-1">Consultant %</th><th className="p-1">PM / SC %</th></tr></thead>
            <tbody>{['Self', 'Manager', 'Upward', 'SLT'].map((c) => (
              <tr key={c}><td className="p-1">{c}</td>
                <td className="p-1"><input type="number" name={`c_${c}`} defaultValue={W(c, 'consultant_pct')} className="input w-24" /></td>
                <td className="p-1"><input type="number" name={`l_${c}`} defaultValue={W(c, 'pm_sc_pct')} className="input w-24" /></td></tr>))}</tbody></table>
        </ActionForm>
      </Box>

      <Box><H>Settings</H>
        <form action={saveSettings} className="flex flex-col gap-2 text-sm">
          <label>Allowed email domain (empty = any) <input name="allowed_email_domain" defaultValue={S.allowed_email_domain} className="input ml-2 w-auto" /></label>
          <label><input type="checkbox" name="allow_edits_until_close" defaultChecked={S.allow_edits_until_close === 'true'} /> Allow edits until close</label>
          <label><input type="checkbox" name="pm_sc_peer_reviews" defaultChecked={S.pm_sc_peer_reviews === 'true'} /> PM/SC peer reviews</label>
          <label>Composite with missing components
            <select name="composite_missing" defaultValue={S.composite_missing} className="input ml-2 w-auto">
              <option value="renormalize">renormalize</option><option value="require_all">require_all</option></select></label>
          <button className="btn-primary w-fit">Save settings</button>
        </form>
      </Box>

      <Box><H>Import past responses (one-time)</H>
        <ActionForm action={importResponses} submit="Import responses">
          <input name="term" placeholder="Term, e.g. Fall 2026" className="input w-auto" />
          <input type="file" name="csv" accept=".csv" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:font-semibold file:text-navy" />
          <p className="text-xs text-muted">Rounds must already exist for that term. Names must match exactly.</p>
        </ActionForm>
      </Box>
    </div>
  );
}
