import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
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
  strengths: z.array(z.string().min(1)),
  improvements: z.array(z.string().min(1)),
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
  weakAreas: z.array(z.string().min(1)),
  nextPracticePlan: z.array(z.string().min(1)),
});

export type Report = z.infer<typeof reportSchema>;

function extractJson(text: string): string {
  const trimmed = text.trim();
  
  // If already starts with JSON delimiter, try it as-is
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Find JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = trimmed.slice(firstBrace, lastBrace + 1);
    return extracted;
  }

  // Find JSON array
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const extracted = trimmed.slice(firstBracket, lastBracket + 1);
    return extracted;
  }

  return trimmed;
}

function cleanJsonString(str: string): string {
  // Remove BOM and other unicode issues
  let cleaned = str.replace(/^\uFEFF/, '');
  
  // Fix common JSON issues
  cleaned = cleaned
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .replace(/:\s*undefined/g, ': null'); // Replace undefined with null
  
  return cleaned;
}

function parseJson<T>(schema: z.ZodType<T>, raw: unknown): T {
  if (typeof raw === 'object' && raw !== null) {
    return schema.parse(raw);
  }

  if (typeof raw === 'string') {
    try {
      const jsonText = extractJson(raw);
      const cleaned = cleanJsonString(jsonText);
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (error) {
      // Log the error for debugging
      console.error('JSON Parse Error:', {
        originalLength: raw.length,
        errorMessage: error instanceof Error ? error.message : String(error),
        snippet: raw.substring(0, 500),
      });
      throw new Error(
        `Failed to parse Gemini response as JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return schema.parse(raw);
}

export async function generateQuestions(input: {
  role: string;
  experienceLevel: string;
  interviewType: 'technical' | 'hr' | 'mixed';
  questionCount: number;
  resumeData?: Part;
}): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_QUESTIONS });

  const prompt = [
    'RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXPLANATIONS, NO EXTRA TEXT.',
    '',
    'Return this exact JSON structure:',
    '{"questions":[{"text":"question","category":"technical","difficulty":"easy"}]}',
    '',
    `Role: ${input.role}`,
    `Experience Level: ${input.experienceLevel}`,
    `Interview Type: ${input.interviewType}`,
    `Num Questions: ${input.questionCount}`,
    '',
    input.resumeData ? `CRITICAL INSTRUCTION: A RESUME FILE IS ATTACHED. You MUST thoroughly analyze the attached resume and ask highly specific, personalized questions based directly on the candidate's actual projects, skills, past companies, and detailed bullet points found in the document.` : '',
    '',
    'REQUIREMENTS:',
    '- Valid JSON only - start with { and end with }',
    '- No markdown, no extra text before or after JSON',
    '- category: "technical" or "hr"',
    '- difficulty: "easy", "medium", or "hard"',
    '- For mixed type: include both categories',
    '- Deeply tailor the questions to the resume if provided',
  ].join('\n');

  const parts: Part[] = [{ text: prompt }];
  if (input.resumeData) {
    parts.push(input.resumeData);
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
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
    'RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXPLANATIONS, NO EXTRA TEXT.',
    '',
    'Evaluate this interview answer and return this exact JSON structure:',
    '{"overallScore":0,"rubric":{"clarity":0,"structure":0,"confidence":0},"strengths":[],"improvements":[],"idealAnswer":"","confidenceSignals":{"hedgingPhrasesFound":[],"fillerCount":0}}',
    '',
    `Role: ${input.role}`,
    `Experience: ${input.experienceLevel}`,
    `Type: ${input.interviewType}`,
    `Question: ${input.questionText}`,
    `Answer: ${input.answerTranscript}`,
    '',
    'REQUIREMENTS:',
    '- Valid JSON only - no markdown, no extra text',
    '- Scores 0-100 integers',
    '- Confidence inferred from hesitation, fillers, firmness',
    '- Clarity: concise, unambiguous communication',
    '- Structure: logical flow and organized points',
    '- strengths & improvements: array of practical strings',
    '- hedgingPhrasesFound: array of phrases detected (or empty)',
    '- fillerCount: integer count of filler words',
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
    'RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXPLANATIONS, NO EXTRA TEXT.',
    '',
    'Create final interview report with this exact JSON structure:',
    '{"summary":"","categoryScores":{"technical":0,"communication":0,"confidence":0},"weakAreas":[],"nextPracticePlan":[]}',
    '',
    `Role: ${input.role}`,
    `Level: ${input.experienceLevel}`,
    `Type: ${input.interviewType}`,
    '',
    'Interview Q/A Data:',
    JSON.stringify(input.qa, null, 2),
    '',
    'REQUIREMENTS:',
    '- Valid JSON only - start with { end with }',
    '- summary: 2-3 sentences',
    '- Scores 0-100 integers',
    '- weakAreas: array of repeated themes (3-5 items)',
    '- nextPracticePlan: 3-5 actionable improvement steps',
    '- No markdown, no extra text anywhere',
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text = result.response.text();
  return parseJson(reportSchema, text);
}
