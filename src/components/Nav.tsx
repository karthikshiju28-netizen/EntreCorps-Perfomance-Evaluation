'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions';
import { Logo } from './Logo';

export function Nav({ isSlt, isLead = false, canDashboard = isSlt, name }: { isSlt: boolean; isLead?: boolean; canDashboard?: boolean; name: string }) {
  const path = usePathname();
  const links = [{ href: '/', label: 'My evaluations' }, ...(isLead ? [{ href: '/project', label: 'My project' }] : []), ...(canDashboard ? [{ href: '/dashboard', label: 'Dashboard' }] : []), ...(isSlt ? [{ href: '/admin', label: 'Admin' }] : [])];
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/"><Logo /></Link>
        <nav className="hidden gap-1 sm:flex">
          {links.map((l) => {
            const active = l.href === '/' ? path === '/' || path.startsWith('/evaluate') : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-navy-50 text-navy' : 'text-muted hover:text-ink'}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs font-bold text-white" title={name}>{initials}</span>
          <form action={signOut}><button className="text-sm font-medium text-muted hover:text-ink">Sign out</button></form>
        </div>
      </div>
      {links.length > 1 && (
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted">{l.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
