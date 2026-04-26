'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { supabase } from '@/lib/supabase';

type Session = {
  id: string;
  role: string;
  experience_level: string;
  interview_type: 'technical' | 'hr' | 'mixed';
  audio_opt_in: boolean;
  status: string;
};

type Question = {
  id: string;
  order_index: number;
  question_text: string;
  category: string;
  difficulty: string;
};

type Answer = {
  id: string;
  question_id: string;
  transcript: string;
  answer_mode: 'text' | 'voice';
  answer_evaluations?: {
    overall_score: number;
    rubric_scores: any;
    strengths: string[];
    improvements: string[];
    ideal_answer: string;
  } | null;
};

type SessionResponse = {
  session: Session;
  questions: Question[];
  answers: Answer[];
};

export default function InterviewSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();

  const { accessToken, userId, previewMode } = useAuth();

  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [answerText, setAnswerText] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [questionShownAt, setQuestionShownAt] = useState<number | null>(null);

  async function refresh() {
    if (!accessToken || previewMode || sessionId === 'preview') return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch<SessionResponse>(`/v1/sessions/${sessionId}`, accessToken);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionId === 'preview') {
      setLoading(false);
      setData({
        session: {
          id: 'preview',
          role: 'Frontend Developer',
          experience_level: 'Fresher',
          interview_type: 'mixed',
          audio_opt_in: true,
          status: 'in_progress',
        },
        questions: [
          {
            id: 'q1',
            order_index: 0,
            question_text: 'Explain event bubbling in the browser and how you would stop it in a React app.',
            category: 'technical',
            difficulty: 'medium',
          },
        ],
        answers: [],
      });
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sessionId]);

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, Answer>();
    for (const a of data?.answers ?? []) map.set(a.question_id, a);
    return map;
  }, [data]);

  const currentQuestion = useMemo(() => {
    const questions = data?.questions ?? [];
    for (const q of questions) {
      if (!answersByQuestion.has(q.id)) return q;
    }
    return null;
  }, [answersByQuestion, data]);

  useEffect(() => {
    if (currentQuestion) {
      setQuestionShownAt(Date.now());
      setAnswerText('');
      setAudioBlob(null);
      setAudioDurationMs(undefined);
      setAnswerMode('text');
    }
  }, [currentQuestion?.id]);

  const latestEvaluation = useMemo(() => {
    if (!data?.answers?.length) return null;
    const last = data.answers[data.answers.length - 1];
    return last?.answer_evaluations ?? null;
  }, [data]);

  async function submitAnswer() {
    if (!accessToken || !userId || !data || !currentQuestion) return;
    if (previewMode || sessionId === 'preview') {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: [
            {
              id: 'a1',
              question_id: currentQuestion.id,
              transcript: answerText,
              answer_mode: answerMode,
              answer_evaluations: {
                overall_score: 78,
                rubric_scores: { clarity: 80, structure: 75, confidence: 78 },
                strengths: ['Clear explanation of propagation and use cases.'],
                improvements: ['Mention capturing phase and practical examples like nested modals.'],
                ideal_answer: 'Event bubbling means the event fires on the target and then propagates up through ancestors. In React, you can stop it using event.stopPropagation() in the handler when needed (e.g., click inside a modal).',
              },
            } as any,
          ],
          session: { ...prev.session, status: 'completed' },
        };
      });
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let uploadedAudioPath: string | undefined;
      if (answerMode === 'voice' && data.session.audio_opt_in && audioBlob) {
        const path = `${userId}/${sessionId}/${currentQuestion.id}-${Date.now()}.webm`;
        const { error: uploadErr } = await supabase.storage.from('audio').upload(path, audioBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: audioBlob.type || 'audio/webm',
        });
        if (uploadErr) throw uploadErr;
        uploadedAudioPath = path;
      }

      const responseLatencyMs = questionShownAt ? Math.max(0, Date.now() - questionShownAt) : undefined;

      await apiFetch('/v1/answers', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answerMode,
          transcript: answerText,
          responseLatencyMs,
          audioDurationMs,
          audioPath: uploadedAudioPath,
        }),
      });

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function completeSession() {
    if (!accessToken) return;
    if (previewMode || sessionId === 'preview') {
      router.replace('/report/preview');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/v1/sessions/${sessionId}/complete`, accessToken, { method: 'POST' });
      router.replace(`/report/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview</h1>
          {data ? (
            <div className="text-sm text-slate-600">
              {data.session.role} • {data.session.experience_level} • {data.session.interview_type}
            </div>
          ) : null}
        </div>

        {loading ? <div>Loading…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {data && !currentQuestion ? (
          <div className="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
            <div className="font-medium">All questions answered.</div>
            <button
              type="button"
              className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={() => void completeSession()}
              disabled={saving}
            >
              Generate final report
            </button>
          </div>
        ) : null}

        {data && currentQuestion ? (
          <div className="space-y-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
            <div>
              <div className="text-xs text-slate-600">
                Question {currentQuestion.order_index + 1} of {data.questions.length} • {currentQuestion.category} • {currentQuestion.difficulty}
              </div>
              <div className="text-lg font-medium">{currentQuestion.question_text}</div>
            </div>

            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={answerMode === 'text'}
                  onChange={() => setAnswerMode('text')}
                />
                Text
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={answerMode === 'voice'}
                  onChange={() => setAnswerMode('voice')}
                />
                Voice
              </label>
              {data.session.audio_opt_in ? (
                <div className="self-center text-xs text-slate-600">Audio opt-in enabled (auto-deleted after 30 days)</div>
              ) : (
                <div className="self-center text-xs text-slate-600">Audio not saved (transcript only)</div>
              )}
            </div>

            {answerMode === 'voice' ? (
              <VoiceRecorder
                onRecorded={({ audioBlob, audioDurationMs, transcript }) => {
                  setAudioBlob(audioBlob);
                  setAudioDurationMs(audioDurationMs);
                  if (transcript) setAnswerText(transcript);
                }}
              />
            ) : null}

            <div className="space-y-2">
              <label className="block text-sm font-medium">Your answer (transcript)</label>
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-600/20 focus:ring-4"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here (or record voice to generate a transcript)…"
              />
            </div>

            <button
              type="button"
              disabled={saving || !answerText.trim()}
              className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={() => void submitAnswer()}
            >
              {saving ? 'Submitting…' : 'Submit answer'}
            </button>
          </div>
        ) : null}

        {latestEvaluation ? (
          <div className="space-y-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70">
            <div className="font-medium">Latest evaluation</div>
            <div className="text-sm">Overall score: {latestEvaluation.overall_score}</div>
            <div className="text-sm">
              <div className="font-medium">Strengths</div>
              <ul className="list-disc pl-5">
                {(latestEvaluation.strengths ?? []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="text-sm">
              <div className="font-medium">Improvements</div>
              <ul className="list-disc pl-5">
                {(latestEvaluation.improvements ?? []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}
