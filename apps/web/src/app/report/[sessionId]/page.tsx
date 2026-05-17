'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, apiFetchBlob } from '@/lib/api';

type ReportRow = {
  session_id: string;
  summary: string;
  category_scores: { technical: number; communication: number; confidence: number };
  weak_areas: string[];
  next_practice_plan: string[];
  generated_at: string;
};

type ReportResponse = { report: ReportRow };

export default function ReportPage() {
  const { accessToken, previewMode } = useAuth();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();

  const [report, setReport] = useState<ReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (sessionId === 'preview') {
      setReport({
        session_id: 'preview',
        summary:
          'Strong foundational understanding with room to improve structure under pressure. Your explanations are mostly clear; add a quick example before concluding.',
        category_scores: { technical: 76, communication: 72, confidence: 74 },
        weak_areas: ['Capturing vs bubbling details', 'Concrete examples under time pressure'],
        next_practice_plan: [
          'Practice explaining DOM event phases with a 30-second example.',
          'Answer using the STAR-like structure: concept → example → when to use.',
          'Reduce hedging phrases ("maybe", "I think") by stating decisions clearly.',
        ],
        generated_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    if (!accessToken || previewMode) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReportResponse>(`/v1/sessions/${sessionId}/report`, accessToken);
      setReport(data.report);
    } catch (e) {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sessionId]);

  async function generate() {
    if (!accessToken) return;
    if (previewMode) {
      router.replace('/report/preview');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/v1/sessions/${sessionId}/complete`, accessToken, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  async function downloadTranscript() {
    if (sessionId === 'preview') {
      const text = [
        'RAMO.AI - Interview Transcript',
        '',
        'Role: Frontend Developer',
        'Experience level: Fresher',
        'Interview type: mixed',
        '',
        'Q1: Explain event bubbling in the browser and how you would stop it in a React app.',
        'A1: (Your transcript will appear here in real runs.)',
        '',
      ].join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ramoai-transcript-preview.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    if (!accessToken || previewMode) return;
    setError(null);
    try {
      const blob = await apiFetchBlob(`/v1/sessions/${sessionId}/transcript.txt`, accessToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ramoai-transcript-${sessionId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Final report</h1>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:h-11"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            Loading report…
          </div>
        ) : null}
        
        {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-200">{error}</div> : null}

        {!report && !loading ? (
          <div className="space-y-4 rounded-3xl bg-white/70 p-6 text-center ring-1 ring-slate-200/70 sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-medium text-slate-900">No report yet</div>
              <p className="mt-1 text-sm text-slate-500">We need to process your interview answers to generate insights.</p>
            </div>
            <button
              type="button"
              className="h-12 w-full max-w-xs rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
              onClick={() => void generate()}
            >
              Generate report now
            </button>
          </div>
        ) : report ? (
          <div className="space-y-6 rounded-3xl bg-white/70 p-6 ring-1 ring-slate-200/70 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                onClick={() => void downloadTranscript()}
              >
                Download transcript
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                onClick={() => router.replace(`/interview/${sessionId}`)}
              >
                Review answers
              </button>
            </div>

            <div className="h-px bg-slate-200/60" />

            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Generated on</div>
              <div className="text-sm text-slate-700">{new Date(report.generated_at).toLocaleString()}</div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-slate-900">Summary</div>
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{report.summary}</div>
            </div>

            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Performance scores</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/80">Technical</div>
                  <div className="mt-1 text-xl font-bold text-blue-700">{report.category_scores.technical}%</div>
                </div>
                <div className="rounded-2xl bg-indigo-50/50 p-4 ring-1 ring-indigo-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/80">Communication</div>
                  <div className="mt-1 text-xl font-bold text-indigo-700">{report.category_scores.communication}%</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600/80">Confidence</div>
                  <div className="mt-1 text-xl font-bold text-slate-700">{report.category_scores.confidence}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="font-semibold text-slate-900">Areas to focus</div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {report.weak_areas.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="font-semibold text-slate-900">Next steps</div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {report.next_practice_plan.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}
