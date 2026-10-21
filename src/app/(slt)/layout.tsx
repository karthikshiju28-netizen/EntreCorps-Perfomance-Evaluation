import { requireDashboard } from '@/lib/session';
import { Nav } from '@/components/Nav';

export default async function SltLayout({ children }: { children: React.ReactNode }) {
  const { person } = await requireDashboard();
  const isSlt = person.role === 'SLT';
  return (
    <>
      <Nav isSlt={isSlt} canDashboard isLead={person.role === 'External Lead'} name={person.full_name} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </>
  );
}
