'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type CreateSessionResponse = {
  session: { id: string };
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function NewInterviewPage() {
  const router = useRouter();
  const { accessToken, userId, previewMode } = useAuth();

  const [role, setRole] = useState('Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [interviewType, setInterviewType] = useState<'technical' | 'hr' | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [audioOptIn, setAudioOptIn] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (previewMode) {
      router.replace('/interview/preview');
      return;
    }

    if (!accessToken || !userId) return;
    setLoading(true);
    setError(null);

    try {
      let resumePath: string | undefined;
      if (resumeFile) {
        const path = `${userId}/${Date.now()}-${safeFileName(resumeFile.name)}`;
        const { error: uploadErr } = await supabase.storage.from('resumes').upload(path, resumeFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: resumeFile.type || 'application/pdf',
        });
        if (uploadErr) throw uploadErr;
        resumePath = path;
      }

      const data = await apiFetch<CreateSessionResponse>('/v1/sessions', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          role,
          experienceLevel,
          interviewType,
          questionCount,
          audioOptIn,
          resumePath,
        }),
      });

      router.replace(`/interview/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">New interview</h1>
          <div className="mt-1 text-sm text-slate-600">Set up your interview and start practicing.</div>
        </div>

        <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="block text-sm font-medium">Role</label>
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="block text-sm font-medium">Experience level</label>
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
          />
        </div>

        <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="block text-sm font-medium">Interview type</label>
          <select
            className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as any)}
          >
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="block text-sm font-medium">Number of questions</label>
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
            type="number"
            min={3}
            max={20}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
          />
        </div>

        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={audioOptIn} onChange={(e) => setAudioOptIn(e.target.checked)} />
            Save audio recordings (optional, auto-deleted after 30 days)
          </label>
        </div>

        <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
          <label className="block text-sm font-medium">Resume (PDF, optional)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          type="button"
          disabled={loading}
          className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => void submit()}
        >
          {loading ? 'Creating…' : 'Create interview'}
        </button>
      </div>
    </RequireAuth>
  );
}
