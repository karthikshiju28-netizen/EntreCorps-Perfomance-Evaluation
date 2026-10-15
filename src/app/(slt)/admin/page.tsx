import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import {
  importRoster, setPersonActive, addProject, setProjectActive, createCycle, setCycleOpen,
  deleteCycleEvaluations, saveWeights, saveSettings, importResponses,
} from './actions';

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>;
const Box = ({ children }: { children: React.ReactNode }) => <section className="rounded border bg-white p-4">{children}</section>;

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
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Box><H>Roster</H>
        <ActionForm action={importRoster} submit="Import CSV">
          <p className="text-sm text-gray-600">Columns: name,email,role,project (upserts by email).</p>
          <input type="file" name="csv" accept=".csv" />
        </ActionForm>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Emails</th><th className="p-2 text-left">Projects</th><th className="p-2 text-left">Active</th></tr></thead>
          <tbody>{(people ?? []).map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.full_name}</td><td className="p-2">{p.role}</td>
              <td className="p-2">{emails?.filter((e) => e.person_id === p.id).map((e) => e.email).join(', ')}</td>
              <td className="p-2">{asg?.filter((a) => a.person_id === p.id).map((a: any) => a.projects?.name).join(', ')}</td>
              <td className="p-2"><form action={setPersonActive}>
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
                <button className="underline">{p.active ? 'Deactivate' : 'Activate'}</button></form></td>
            </tr>))}</tbody></table></div>
      </Box>

      <Box><H>Projects</H>
        <ul className="mb-2 text-sm">{(projs ?? []).map((p) => (
          <li key={p.id} className="flex gap-3 py-1">{p.name} {!p.active && '(inactive)'}
            <form action={setProjectActive}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
              <button className="underline">{p.active ? 'Deactivate' : 'Activate'}</button></form></li>))}</ul>
        <form action={addProject} className="flex gap-2"><input name="name" placeholder="Project 7" className="rounded border px-2 py-1" required />
          <button className="rounded bg-blue-700 px-3 text-white">Add</button></form>
      </Box>

      <Box><H>Rounds</H>
        <ul className="mb-3 flex flex-col gap-1 text-sm">{(cycles ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3">
            <span>{c.term} · {c.round} {c.is_open && <b className="text-green-700">(open)</b>}</span>
            <form action={setCycleOpen}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="open" value={String(!c.is_open)} />
              <button className="underline">{c.is_open ? 'Close' : 'Open'}</button></form>
            <form action={deleteCycleEvaluations}><input type="hidden" name="id" value={c.id} />
              <button className="text-red-700 underline">Delete this round&apos;s evaluations</button></form>
          </li>))}</ul>
        <form action={createCycle} className="flex flex-wrap gap-2 text-sm">
          <input name="term" placeholder="Fall 2026" required className="rounded border px-2 py-1" />
          <select name="round" className="rounded border px-2 py-1"><option>Mid-term Evaluation</option><option>Final Evaluation</option></select>
          <input type="date" name="closes_at" className="rounded border px-2 py-1" />
          <button className="rounded bg-blue-700 px-3 text-white">Create round</button></form>
      </Box>

      <Box><H>Weights</H>
        <ActionForm action={saveWeights} submit="Save weights">
          <table className="text-sm"><thead><tr><th className="p-1 text-left">Component</th><th className="p-1">Consultant %</th><th className="p-1">PM / SC %</th></tr></thead>
            <tbody>{['Self', 'Manager', 'Upward', 'SLT'].map((c) => (
              <tr key={c}><td className="p-1">{c}</td>
                <td className="p-1"><input type="number" name={`c_${c}`} defaultValue={W(c, 'consultant_pct')} className="w-20 rounded border px-2" /></td>
                <td className="p-1"><input type="number" name={`l_${c}`} defaultValue={W(c, 'pm_sc_pct')} className="w-20 rounded border px-2" /></td></tr>))}</tbody></table>
        </ActionForm>
      </Box>

      <Box><H>Settings</H>
        <form action={saveSettings} className="flex flex-col gap-2 text-sm">
          <label>Allowed email domain (empty = any) <input name="allowed_email_domain" defaultValue={S.allowed_email_domain} className="ml-2 rounded border px-2 py-1" /></label>
          <label><input type="checkbox" name="allow_edits_until_close" defaultChecked={S.allow_edits_until_close === 'true'} /> Allow edits until close</label>
          <label><input type="checkbox" name="pm_sc_peer_reviews" defaultChecked={S.pm_sc_peer_reviews === 'true'} /> PM/SC peer reviews</label>
          <label>Composite with missing components
            <select name="composite_missing" defaultValue={S.composite_missing} className="ml-2 rounded border px-2 py-1">
              <option value="renormalize">renormalize</option><option value="require_all">require_all</option></select></label>
          <button className="w-fit rounded bg-blue-700 px-4 py-2 text-white">Save settings</button>
        </form>
      </Box>

      <Box><H>Import past responses (one-time)</H>
        <ActionForm action={importResponses} submit="Import responses">
          <input name="term" placeholder="Term, e.g. Fall 2026" className="rounded border px-2 py-1 text-sm" />
          <input type="file" name="csv" accept=".csv" />
          <p className="text-xs text-gray-600">Rounds must already exist for that term. Names must match exactly.</p>
        </ActionForm>
      </Box>
    </div>
  );
}
