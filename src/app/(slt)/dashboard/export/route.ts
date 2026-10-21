import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: ok } = await sb.rpc('can_view_dashboard');
  if (!ok) return new NextResponse('Not found', { status: 404 });
  const q = req.nextUrl.searchParams;
  const kind = q.get('kind');
  let rows: Record<string, unknown>[] = [];
  if (kind === 'responses') {
    let query = sb.from('responses').select('*');
    if (q.get('term')) query = query.eq('Term', q.get('term')!);
    rows = ((await query).data ?? []) as Record<string, unknown>[];
  } else {
    const { data } = await sb.rpc('person_scores', { p_term: q.get('term') || null, p_round: q.get('round') || 'All Rounds' });
    rows = (data ?? []).map((r: any) => ({
      Project: r.projects, Role: r.role, Name: r.full_name, Self: r.self_score, Manager: r.manager_score,
      Upward: r.upward_score, SLT: r.slt_score, '# Evals': r.n_evals, Composite: r.composite,
    }));
  }
  return new NextResponse(toCsv(rows), {
    headers: { 'content-type': 'text/csv', 'content-disposition': `attachment; filename="${kind}.csv"` },
  });
}
