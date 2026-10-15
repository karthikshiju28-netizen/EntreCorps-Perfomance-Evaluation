import { requirePerson } from '@/lib/session';
import { Nav } from '@/components/Nav';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const { person } = await requirePerson();
  return (<><Nav isSlt={person.role === 'SLT'} /><div className="mx-auto max-w-3xl px-4 py-6">{children}</div></>);
}
