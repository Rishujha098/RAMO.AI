'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import { Logo } from './Logo';

export function TopNav() {
  const { session, previewMode } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="text-slate-700 hover:text-slate-900"
          >
            Dashboard
          </Link>
          <Link
            href="/interview/new"
            className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Start interview
          </Link>
          {previewMode ? (
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Preview mode
            </Link>
          ) : session ? (
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              onClick={() => supabase.auth.signOut()}
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
