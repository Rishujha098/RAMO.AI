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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Final report</h1>
          <Link
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? <div>Loading…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!report ? (
          <div className="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
            <div className="text-sm text-slate-600">No report yet for this session.</div>
            <button
              type="button"
              className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={() => void generate()}
            >
              Generate report
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => void downloadTranscript()}
              >
                Download my transcript
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => router.replace(`/interview/${sessionId}`)}
              >
                View interview
              </button>
            </div>

            <div>
              <div className="text-sm text-slate-600">Generated at: {new Date(report.generated_at).toLocaleString()}</div>
            </div>

            <div>
              <div className="font-medium">Summary</div>
              <div className="text-sm whitespace-pre-wrap">{report.summary}</div>
            </div>

            <div>
              <div className="font-medium">Scores</div>
              <div className="text-sm">
                Technical: {report.category_scores.technical} • Communication: {report.category_scores.communication} • Confidence: {report.category_scores.confidence}
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium">Weak areas</div>
              <ul className="list-disc pl-5">
                {report.weak_areas.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>

            <div className="text-sm">
              <div className="font-medium">Next practice plan</div>
              <ul className="list-disc pl-5">
                {report.next_practice_plan.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
