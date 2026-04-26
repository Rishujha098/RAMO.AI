import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';

export async function runAudioCleanup(options?: { dryRun?: boolean }) {
  const supabase = createSupabaseAdminClient();

  const retentionMs = env.AUDIO_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(Date.now() - retentionMs).toISOString();

  const { data: rows, error } = await supabase
    .from('interview_answers')
    .select('id, audio_path')
    .not('audio_path', 'is', null)
    .lt('audio_uploaded_at', cutoffIso)
    .limit(1000);

  if (error) {
    throw new Error(`db_error: ${error.message}`);
  }

  const paths = (rows ?? []).map((r) => r.audio_path).filter((p): p is string => Boolean(p));
  if (!paths.length) {
    return { scanned: rows?.length ?? 0, deleted: 0 };
  }

  if (!options?.dryRun) {
    const { error: storageErr } = await supabase.storage.from(env.AUDIO_BUCKET).remove(paths);
    if (storageErr) {
      throw new Error(`storage_error: ${storageErr.message}`);
    }

    const { error: updateErr } = await supabase
      .from('interview_answers')
      .update({ audio_path: null, audio_uploaded_at: null })
      .in(
        'id',
        (rows ?? []).map((r) => r.id)
      );

    if (updateErr) {
      throw new Error(`db_error: ${updateErr.message}`);
    }
  }

  return { scanned: rows?.length ?? 0, deleted: paths.length };
}

// Allow running as a standalone script: `npm run audio:cleanup`
const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  runAudioCleanup()
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ ok: true, ...result }));
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ ok: false, error: String(err) }));
      process.exitCode = 1;
    });
}
