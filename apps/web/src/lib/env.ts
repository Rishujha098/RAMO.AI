function requiredPublicEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

// IMPORTANT: Next.js only inlines NEXT_PUBLIC_* env vars when accessed directly.
// Avoid dynamic access like process.env[name] in code that runs in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const previewMode = process.env.NEXT_PUBLIC_PREVIEW_MODE;

const previewModeEnabled = previewMode === '1' || previewMode === 'true';

function requiredUnlessPreview(
  value: string | undefined,
  name: string,
  previewFallback: string,
): string {
  if (previewModeEnabled) {
    const trimmed = value?.trim();
    return normalizeBaseUrl(trimmed && trimmed.length > 0 ? trimmed : previewFallback);
  }
  return normalizeBaseUrl(requiredPublicEnv(value, name));
}

export const publicEnv = {
  supabaseUrl: requiredUnlessPreview(
    supabaseUrl,
    'NEXT_PUBLIC_SUPABASE_URL',
    'http://localhost:54321',
  ),
  supabaseAnonKey: requiredUnlessPreview(
    supabaseAnonKey,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'preview-anon-key',
  ),
  apiBaseUrl: requiredUnlessPreview(apiBaseUrl, 'NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001'),
  previewMode: previewModeEnabled,
};
