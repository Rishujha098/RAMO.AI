import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from './env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const questionSchema = z.object({
  text: z.string().min(1),
  category: z.enum(['technical', 'hr']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const questionsResponseSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

export type GeneratedQuestion = z.infer<typeof questionSchema>;

const evaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  rubric: z.object({
    clarity: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    roleFit: z.number().min(0).max(100).optional(),
    technical: z.number().min(0).max(100).optional(),
  }),
  strengths: z.array(z.string().min(1)).min(1),
  improvements: z.array(z.string().min(1)).min(1),
  idealAnswer: z.string().min(1),
  confidenceSignals: z
    .object({
      hedgingPhrasesFound: z.array(z.string()).optional(),
      fillerCount: z.number().int().min(0).optional(),
      hesitationNotes: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

const reportSchema = z.object({
  summary: z.string().min(1),
  categoryScores: z.object({
    technical: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
  }),
  weakAreas: z.array(z.string().min(1)).min(1),
  nextPracticePlan: z.array(z.string().min(1)).min(1),
});

export type Report = z.infer<typeof reportSchema>;

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
}

function parseJson<T>(schema: z.ZodType<T>, raw: unknown): T {
  if (typeof raw === 'object' && raw !== null) {
    return schema.parse(raw);
  }

  if (typeof raw === 'string') {
    const jsonText = extractJson(raw);
    return schema.parse(JSON.parse(jsonText));
  }

  return schema.parse(raw);
}

export async function generateQuestions(input: {
  role: string;
  experienceLevel: string;
  interviewType: 'technical' | 'hr' | 'mixed';
  questionCount: number;
}): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_QUESTIONS });

  const prompt = [
    'Generate interview questions as strict JSON.',
    '',
    'Return exactly this JSON object shape:',
    '{"questions":[{"text":"...","category":"technical|hr","difficulty":"easy|medium|hard"}]}',
    '',
    `Role: ${input.role}`,
    `Experience level: ${input.experienceLevel}`,
    `Interview type: ${input.interviewType}`,
    `Number of questions: ${input.questionCount}`,
    '',
    'Constraints:',
    '- Do not include markdown or extra keys.',
    '- Keep questions realistic and role-specific.',
    '- If interview type is mixed, include both technical and hr categories.',
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text = result.response.text();
  const parsed = parseJson(questionsResponseSchema, text);

  return parsed.questions.slice(0, input.questionCount);
}

export async function evaluateAnswer(input: {
  role: string;
  experienceLevel: string;
  interviewType: 'technical' | 'hr' | 'mixed';
  questionText: string;
  answerTranscript: string;
  responseLatencyMs?: number;
  audioDurationMs?: number;
}): Promise<Evaluation> {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_EVAL });

  const prompt = [
    'You are an interview evaluator. Evaluate the candidate answer and return strict JSON only.',
    '',
    'Return exactly this JSON object shape:',
    '{',
    '  "overallScore": 0-100,',
    '  "rubric": {"clarity":0-100,"structure":0-100,"confidence":0-100,"roleFit":0-100,"technical":0-100},',
    '  "strengths": ["..."],',
    '  "improvements": ["..."],',
    '  "idealAnswer": "...",',
    '  "confidenceSignals": {"hedgingPhrasesFound":["..."],"fillerCount":0,"hesitationNotes":["..."]}',
    '}',
    '',
    `Role: ${input.role}`,
    `Experience level: ${input.experienceLevel}`,
    `Interview type: ${input.interviewType}`,
    '',
    `Question: ${input.questionText}`,
    `Answer (transcript): ${input.answerTranscript}`,
    '',
    'Voice/timing signals (optional):',
    `- responseLatencyMs: ${input.responseLatencyMs ?? 'null'}`,
    `- audioDurationMs: ${input.audioDurationMs ?? 'null'}`,
    '',
    'Scoring guidance:',
    '- Confidence is inferred from certainty vs hesitation, filler phrases, and explanation firmness.',
    '- Clarity rewards concise, unambiguous communication.',
    '- Structure rewards logical flow and organized points.',
    '- Keep feedback practical and actionable.',
    '- Do not mention that you are an AI or refer to policies.',
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text = result.response.text();
  const parsed = parseJson(evaluationSchema, text);

  // Ensure optional rubric keys exist for consistent UI.
  return {
    ...parsed,
    rubric: {
      clarity: parsed.rubric.clarity,
      structure: parsed.rubric.structure,
      confidence: parsed.rubric.confidence,
      roleFit: parsed.rubric.roleFit ?? parsed.rubric.clarity,
      technical: parsed.rubric.technical ?? parsed.rubric.roleFit ?? parsed.rubric.clarity,
    },
  };
}

export async function generateReport(input: {
  role: string;
  experienceLevel: string;
  interviewType: 'technical' | 'hr' | 'mixed';
  qa: Array<{ question: string; answer: string; overallScore: number }>;
}): Promise<Report> {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_REPORT });

  const prompt = [
    'You are an interview coach. Create a final report from the interview Q/A and scores. Return strict JSON only.',
    '',
    'Return exactly this JSON object shape:',
    '{',
    '  "summary": "...",',
    '  "categoryScores": {"technical":0-100,"communication":0-100,"confidence":0-100},',
    '  "weakAreas": ["..."],',
    '  "nextPracticePlan": ["..."]',
    '}',
    '',
    `Role: ${input.role}`,
    `Experience level: ${input.experienceLevel}`,
    `Interview type: ${input.interviewType}`,
    '',
    'Interview data:',
    JSON.stringify(input.qa, null, 2),
    '',
    'Guidance:',
    '- Keep summary concise (4-6 sentences).',
    '- Weak areas should be specific and repeated themes.',
    '- Next practice plan should be 3-7 actionable steps.',
    '- Do not include markdown.',
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text = result.response.text();
  return parseJson(reportSchema, text);
}
