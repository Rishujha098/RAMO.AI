import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../lib/env.js';
import { runAudioCleanup } from '../jobs/audioCleanup.js';

function requireCronSecret(provided: string | undefined) {
  if (!env.CRON_SECRET) return true; // allow in dev if not configured
  return provided === env.CRON_SECRET;
}

export async function internalRoutes(app: FastifyInstance) {
  app.post('/internal/cron/audio-cleanup', async (request, reply) => {
    const headerSecret = request.headers['x-cron-secret'];
    const query = z.object({ secret: z.string().optional(), dryRun: z.string().optional() }).parse(request.query);

    const secret =
      typeof headerSecret === 'string'
        ? headerSecret
        : Array.isArray(headerSecret)
          ? headerSecret[0]
          : query.secret;

    if (!requireCronSecret(secret)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const dryRun = query.dryRun === '1' || query.dryRun === 'true';
    const result = await runAudioCleanup({ dryRun });
    return { ok: true, ...result };
  });
}
