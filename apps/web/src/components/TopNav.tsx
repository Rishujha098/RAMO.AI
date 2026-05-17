'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import { Logo } from './Logo';

export function TopNav() {
  const { session, previewMode } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo size="sm" />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/interview/new"
            className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 sm:h-10 sm:px-5 sm:text-sm"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start interview</span>
          </Link>
          {previewMode ? (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
            >
              Preview
            </Link>
          ) : session ? (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
              onClick={() => supabase.auth.signOut()}
            >
              <span className="sm:hidden">Exit</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
