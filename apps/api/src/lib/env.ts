import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load env files in a predictable way for monorepo usage.
// - When running from repo root: `process.cwd()` is the root.
// - When running from apps/api: `process.cwd()` is apps/api.
// We also load env files relative to this module's location to always pick up apps/api/.env.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(moduleDir, '..', '..', '..');
const cwd = process.cwd();

const candidateEnvFiles = [
  path.join(cwd, '.env'),
  path.join(cwd, '.env.local'),
  path.join(apiRoot, '.env'),
  path.join(apiRoot, '.env.local'),
];

for (const envPath of candidateEnvFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().optional(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(10),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_QUESTIONS: z.string().default('gemini-1.5-flash'),
  GEMINI_MODEL_EVAL: z.string().default('gemini-1.5-flash'),
  GEMINI_MODEL_REPORT: z.string().default('gemini-1.5-flash'),

  CORS_ALLOWED_ORIGINS: z.string().optional(),

  AUDIO_BUCKET: z.string().default('audio'),
  AUDIO_RETENTION_DAYS: z.coerce.number().int().positive().default(30),

  CRON_SECRET: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export function getCorsAllowedOrigins(): string[] {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (env.NODE_ENV === 'production') return [];
  return ['http://localhost:3000'];
}
