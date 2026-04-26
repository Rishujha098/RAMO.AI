'use client';

import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname === '/login';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-50 via-slate-50 to-slate-100 text-slate-900">
      {hideChrome ? null : <TopNav />}
      <main className={hideChrome ? undefined : 'mx-auto w-full max-w-5xl flex-1 px-4 py-6'}>
        {children}
      </main>
    </div>
  );
}
