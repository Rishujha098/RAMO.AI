import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env, getCorsAllowedOrigins } from './lib/env.js';
import { registerRoutes } from './routes/index.js';

const app = Fastify({
  logger: true,
});

await app.register(sensible);
await app.register(helmet);

const allowedOrigins = getCorsAllowedOrigins();
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!allowedOrigins.length) return cb(null, false);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
});

await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
});

await registerRoutes(app);

const port = env.PORT ?? 3001;
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
