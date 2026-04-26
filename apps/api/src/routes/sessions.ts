import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { createSupabaseUserClient } from '../lib/supabase.js';
import { evaluateAnswer, generateQuestions, generateReport } from '../lib/gemini.js';

const interviewTypeSchema = z.enum(['technical', 'hr', 'mixed']);

type InterviewType = z.infer<typeof interviewTypeSchema>;

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

export async function sessionRoutes(app: FastifyInstance) {
  app.get('/v1/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const supabase = createSupabaseUserClient(request.accessToken!);

    const { data, error } = await supabase
      .from('interview_sessions')
      .select('id, role, experience_level, interview_type, status, created_at')
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: 'db_error', details: error.message });
    return { sessions: data };
  });

  app.post('/v1/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const body = z
      .object({
        role: z.string().min(1).max(80),
        experienceLevel: z.string().min(1).max(80),
        interviewType: interviewTypeSchema,
        questionCount: z.number().int().min(3).max(20),
        audioOptIn: z.boolean().default(false),
        resumePath: z.string().min(1).optional(),
      })
      .parse(request.body);

    const supabase = createSupabaseUserClient(request.accessToken!);

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: request.user!.id,
        role: body.role,
        experience_level: body.experienceLevel,
        interview_type: body.interviewType,
        question_count: body.questionCount,
        audio_opt_in: body.audioOptIn,
        resume_path: body.resumePath ?? null,
        status: 'in_progress',
      })
      .select('*')
      .single();

    if (sessionError) {
      return reply.code(500).send({ error: 'db_error', details: sessionError.message });
    }

    const questions = await generateQuestions({
      role: body.role,
      experienceLevel: body.experienceLevel,
      interviewType: body.interviewType,
      questionCount: body.questionCount,
    });

    const { data: insertedQuestions, error: qError } = await supabase
      .from('interview_questions')
      .insert(
        questions.map((q, index) => ({
          session_id: session.id,
          order_index: index,
          question_text: q.text,
          category: q.category,
          difficulty: q.difficulty,
          source: 'ai',
        }))
      )
      .select('*')
      .order('order_index', { ascending: true });

    if (qError) {
      return reply.code(500).send({ error: 'db_error', details: qError.message });
    }

    return {
      session,
      questions: insertedQuestions,
    };
  });

  app.get('/v1/sessions/:sessionId', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const supabase = createSupabaseUserClient(request.accessToken!);

    const { data: session, error: sErr } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .single();

    if (sErr) return reply.code(404).send({ error: 'not_found' });

    const { data: questions, error: qErr } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', params.sessionId)
      .order('order_index', { ascending: true });

    if (qErr) return reply.code(500).send({ error: 'db_error', details: qErr.message });

    const { data: answers, error: aErr } = await supabase
      .from('interview_answers')
      .select('*, answer_evaluations(*)')
      .eq('session_id', params.sessionId)
      .order('created_at', { ascending: true });

    if (aErr) return reply.code(500).send({ error: 'db_error', details: aErr.message });

    return { session, questions, answers };
  });

  app.post('/v1/answers', { preHandler: requireAuth }, async (request, reply) => {
    const body = z
      .object({
        sessionId: z.string().uuid(),
        questionId: z.string().uuid(),
        answerMode: z.enum(['text', 'voice']),
        transcript: z.string().min(1).max(12_000),
        responseLatencyMs: z.number().int().min(0).max(10 * 60_000).optional(),
        audioDurationMs: z.number().int().min(0).max(10 * 60_000).optional(),
        audioPath: z.string().min(1).optional(),
      })
      .parse(request.body);

    const supabase = createSupabaseUserClient(request.accessToken!);

    const { data: session, error: sErr } = await supabase
      .from('interview_sessions')
      .select('id, role, experience_level, interview_type, audio_opt_in')
      .eq('id', body.sessionId)
      .single();

    if (sErr || !session) return reply.code(404).send({ error: 'session_not_found' });

    const { data: question, error: qErr } = await supabase
      .from('interview_questions')
      .select('id, question_text')
      .eq('id', body.questionId)
      .eq('session_id', body.sessionId)
      .single();

    if (qErr || !question) return reply.code(404).send({ error: 'question_not_found' });

    let normalizedAudioPath: string | null = null;
    let audioUploadedAt: string | null = null;

    if (body.audioPath) {
      if (!session.audio_opt_in) {
        return reply.code(400).send({ error: 'audio_not_opted_in' });
      }
      // Minimal ownership check: enforce user-id prefix in the object path.
      if (!body.audioPath.startsWith(`${request.user!.id}/`)) {
        return reply.code(400).send({ error: 'invalid_audio_path' });
      }

      normalizedAudioPath = body.audioPath;
      audioUploadedAt = new Date().toISOString();
    }

    const { data: answerRow, error: aErr } = await supabase
      .from('interview_answers')
      .insert({
        session_id: body.sessionId,
        question_id: body.questionId,
        answer_mode: body.answerMode,
        transcript: body.transcript,
        response_latency_ms: body.responseLatencyMs ?? null,
        audio_duration_ms: body.audioDurationMs ?? null,
        audio_path: normalizedAudioPath,
        audio_uploaded_at: audioUploadedAt,
      })
      .select('*')
      .single();

    if (aErr) return reply.code(500).send({ error: 'db_error', details: aErr.message });

    const evaluation = await evaluateAnswer({
      role: session.role,
      experienceLevel: session.experience_level,
      interviewType: session.interview_type as InterviewType,
      questionText: question.question_text,
      answerTranscript: body.transcript,
      ...(body.responseLatencyMs !== undefined
        ? { responseLatencyMs: body.responseLatencyMs }
        : {}),
      ...(body.audioDurationMs !== undefined ? { audioDurationMs: body.audioDurationMs } : {}),
    });

    const { data: evalRow, error: eErr } = await supabase
      .from('answer_evaluations')
      .insert({
        answer_id: answerRow.id,
        overall_score: evaluation.overallScore,
        rubric_scores: asJson(evaluation.rubric),
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        ideal_answer: evaluation.idealAnswer,
        confidence_signals: asJson(evaluation.confidenceSignals ?? null),
      })
      .select('*')
      .single();

    if (eErr) return reply.code(500).send({ error: 'db_error', details: eErr.message });

    return {
      answer: answerRow,
      evaluation: evalRow,
    };
  });

  app.post(
    '/v1/sessions/:sessionId/complete',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      const supabase = createSupabaseUserClient(request.accessToken!);

      const { data: session, error: sErr } = await supabase
        .from('interview_sessions')
        .select('id, role, experience_level, interview_type')
        .eq('id', params.sessionId)
        .single();

      if (sErr || !session) return reply.code(404).send({ error: 'session_not_found' });

      const { data: qaRows, error: qaErr } = await supabase
        .from('interview_questions')
        .select(
          'id, order_index, question_text, interview_answers(id, transcript, answer_evaluations(overall_score))'
        )
        .eq('session_id', params.sessionId)
        .order('order_index', { ascending: true });

      if (qaErr) return reply.code(500).send({ error: 'db_error', details: qaErr.message });

      const qa = (qaRows ?? []).map((q) => {
        const answer = Array.isArray((q as any).interview_answers)
          ? (q as any).interview_answers[0]
          : null;
        const overall = answer?.answer_evaluations?.overall_score;
        return {
          question: q.question_text,
          answer: answer?.transcript ?? '',
          overallScore: typeof overall === 'number' ? overall : 0,
        };
      });

      const report = await generateReport({
        role: session.role,
        experienceLevel: session.experience_level,
        interviewType: session.interview_type as InterviewType,
        qa,
      });

      const { data: reportRow, error: rErr } = await supabase
        .from('session_reports')
        .upsert({
          session_id: params.sessionId,
          summary: report.summary,
          category_scores: asJson(report.categoryScores),
          weak_areas: report.weakAreas,
          next_practice_plan: report.nextPracticePlan,
          generated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (rErr) return reply.code(500).send({ error: 'db_error', details: rErr.message });

      await supabase
        .from('interview_sessions')
        .update({ status: 'completed' })
        .eq('id', params.sessionId);

      return { report: reportRow };
    }
  );

  app.get('/v1/sessions/:sessionId/report', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const supabase = createSupabaseUserClient(request.accessToken!);

    const { data, error } = await supabase
      .from('session_reports')
      .select('*')
      .eq('session_id', params.sessionId)
      .single();

    if (error) return reply.code(404).send({ error: 'report_not_found' });
    return { report: data };
  });

  app.get(
    '/v1/sessions/:sessionId/transcript.txt',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      const supabase = createSupabaseUserClient(request.accessToken!);

      const { data: session, error: sErr } = await supabase
        .from('interview_sessions')
        .select('id, role, experience_level, interview_type, created_at')
        .eq('id', params.sessionId)
        .single();

      if (sErr || !session) return reply.code(404).send({ error: 'session_not_found' });

      const { data: qaRows, error: qaErr } = await supabase
        .from('interview_questions')
        .select(
          'order_index, question_text, interview_answers(transcript, created_at)'
        )
        .eq('session_id', params.sessionId)
        .order('order_index', { ascending: true });

      if (qaErr) return reply.code(500).send({ error: 'db_error', details: qaErr.message });

      const lines: string[] = [];
      lines.push('RAMO.AI - Interview Transcript');
      lines.push('');
      lines.push(`Role: ${session.role}`);
      lines.push(`Experience level: ${session.experience_level}`);
      lines.push(`Interview type: ${session.interview_type}`);
      lines.push(`Created at: ${session.created_at}`);
      lines.push('');

      for (const row of qaRows ?? []) {
        const answers = (row as any).interview_answers as Array<{ transcript: string }> | null;
        const answerText = answers?.[0]?.transcript ?? '';
        lines.push(`Q${row.order_index + 1}: ${row.question_text}`);
        lines.push(`A${row.order_index + 1}: ${answerText}`);
        lines.push('');
      }

      const text = lines.join('\n');
      reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="ramoai-transcript-${params.sessionId}.txt"`
        )
        .send(text);
    }
  );
}
