import Link from 'next/link';
import { signOut } from '@/app/actions';

export function Nav({ isSlt }: { isSlt: boolean }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-semibold">EntreCorps Evaluations</Link>
        {isSlt && <Link href="/dashboard" className="text-blue-700">Dashboard</Link>}
        {isSlt && <Link href="/admin" className="text-blue-700">Admin</Link>}
        <form action={signOut} className="ml-auto"><button className="text-gray-600 underline">Sign out</button></form>
      </div>
    </header>
  );
}
