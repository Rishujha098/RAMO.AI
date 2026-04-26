'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

type SessionRow = {
  id: string;
  role: string;
  experience_level: string;
  interview_type: string;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const { accessToken, previewMode } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Link
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            href="/interview/new"
          >
            Start interview
          </Link>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">History</h2>
          {sessions.length === 0 ? (
            <div className="text-sm text-slate-600">No interviews yet.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70"
                >
                  <div>
                    <div className="font-medium">{s.role}</div>
                    <div className="text-xs text-slate-600">
                      {s.experience_level} • {s.interview_type} • {new Date(s.created_at).toLocaleString()} • {s.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      href={`/interview/${s.id}`}
                    >
                      Open
                    </Link>
                    <Link
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
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

        <div className="text-sm">
          <Link className="font-medium text-blue-700 hover:text-blue-800" href="/admin">
            Admin
          </Link>
        </div>
      </div>
    </RequireAuth>
  );
}
