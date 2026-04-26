'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

type UserRow = {
  user_id: string;
  name: string | null;
  target_role: string | null;
  experience_level: string | null;
  is_admin: boolean;
  created_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  role: string;
  experience_level: string;
  interview_type: string;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const { accessToken, previewMode } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || previewMode) {
      if (previewMode) {
        setUsers([
          {
            user_id: 'preview-user',
            name: 'Preview User',
            target_role: 'Frontend Developer',
            experience_level: 'Fresher',
            is_admin: true,
            created_at: new Date().toISOString(),
          },
        ]);
        setSessions([
          {
            id: 'preview',
            user_id: 'preview-user',
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
    Promise.all([
      apiFetch<{ users: UserRow[] }>('/v1/admin/users', accessToken),
      apiFetch<{ sessions: SessionRow[] }>('/v1/admin/sessions', accessToken),
    ])
      .then(([u, s]) => {
        setUsers(u.users ?? []);
        setSessions(s.sessions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [accessToken]);

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            href="/dashboard"
          >
            Back
          </Link>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <div className="font-medium">Users ({users.length})</div>
          <div className="mt-2 space-y-2 text-sm">
            {users.slice(0, 50).map((u) => (
              <div key={u.user_id} className="flex justify-between gap-3">
                <div className="truncate">{u.user_id}</div>
                <div className="text-slate-600">{u.is_admin ? 'admin' : 'user'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <div className="font-medium">Recent sessions ({sessions.length})</div>
          <div className="mt-2 space-y-2 text-sm">
            {sessions.slice(0, 50).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <Link className="font-medium text-blue-700 hover:text-blue-800" href={`/interview/${s.id}`}>
                  {s.role}
                </Link>
                <div className="text-slate-600">{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
