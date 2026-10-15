import { requireSlt } from '@/lib/session';
import { Nav } from '@/components/Nav';

export default async function SltLayout({ children }: { children: React.ReactNode }) {
  await requireSlt();
  return (<><Nav isSlt /><div className="mx-auto max-w-5xl px-4 py-6">{children}</div></>);
}
