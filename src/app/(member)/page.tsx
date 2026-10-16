import { requirePerson } from '@/lib/session';
import { MyEvaluations, type Task } from '@/components/MyEvaluations';

export default async function Home({ searchParams }: { searchParams: Promise<{ project?: string; saved?: string }> }) {
  const { sb, person, projects } = await requirePerson();
  const { project, saved } = await searchParams;
  const { data: cycle } = await sb.from('cycles').select('term, round, closes_at').eq('is_open', true).maybeSingle();
  const { data } = await sb.rpc('my_tasks');
  return (
    <MyEvaluations person={person} projects={projects} cycle={cycle} tasks={(data ?? []) as Task[]}
      project={project} saved={!!saved} />
  );
}
