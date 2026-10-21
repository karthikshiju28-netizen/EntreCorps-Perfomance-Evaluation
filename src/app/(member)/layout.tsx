import { requirePerson } from '@/lib/session';
import { Nav } from '@/components/Nav';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const { person } = await requirePerson();
  return (<><Nav isSlt={person.role === 'SLT'} canDashboard={['SLT', 'External Lead'].includes(person.role)} isLead={['Project Manager', 'Senior Consultant', 'External Lead'].includes(person.role)} name={person.full_name} /><div className="mx-auto max-w-3xl px-4 py-8">{children}</div></>);
}
