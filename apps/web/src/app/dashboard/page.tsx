'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type SessionRow = {
  id: string;
  role: string;
  experience_level: string;
  interview_type: string;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const { accessToken, previewMode, session, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (previewMode) {
      setDisplayName('there');
      return;
    }
    if (!session) {
      setDisplayName('');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('first_name,last_name,name')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (cancelled) return;
        if (profileError) throw profileError;

        const first = (data?.first_name ?? '').trim();
        const full = (data?.name ?? '').trim();

        const fromMetadata =
          (typeof session.user.user_metadata?.given_name === 'string'
            ? session.user.user_metadata.given_name
            : '') ||
          (typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : '') ||
          (typeof session.user.user_metadata?.name === 'string'
            ? session.user.user_metadata.name
            : '');

        const fallback = (session.user.email ?? '').split('@')[0] ?? '';
        const chosen = first || full || String(fromMetadata).trim() || fallback || 'there';
        setDisplayName(chosen);
      } catch {
        if (cancelled) return;
        const fallback = (session.user.email ?? '').split('@')[0] ?? '';
        setDisplayName(fallback || 'there');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewMode, session]);

  useEffect(() => {
    if (!accessToken || previewMode) {
      if (previewMode) {
        setSessions([
          {
            id: 'preview',
            role: 'Frontend Developer',
            experience_level: 'Fresher',
            interview_type: 'mixed',
            status: 'in_progress',
            created_at: new Date().toISOString(),
          },
        ]);
      }
      return;
    }
    apiFetch<{ sessions: SessionRow[] }>('/v1/sessions', accessToken)
      .then((data) => setSessions(data.sessions ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [accessToken, previewMode]);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Hey {displayName || 'there'}</h1>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            href="/interview/new"
          >
            Start interview
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-200">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
          {sessions.length === 0 ? (
            <div className="rounded-2xl bg-white/50 p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200/70">
              No interviews yet. Start one to see your history here!
            </div>
          ) : (
            <div className="grid gap-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{s.role}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{s.experience_level}</span>
                      <span className="text-slate-300">•</span>
                      <span>{s.interview_type}</span>
                      <span className="text-slate-300">•</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{s.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                      href={`/interview/${s.id}`}
                    >
                      Open
                    </Link>
                    <Link
                      className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                      href={`/report/${s.id}`}
                    >
                      Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="text-sm">
            <Link className="font-medium text-blue-700 hover:text-blue-800" href="/admin">
              Admin
            </Link>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
