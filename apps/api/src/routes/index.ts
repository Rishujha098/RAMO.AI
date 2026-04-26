import type { FastifyInstance } from 'fastify';
import { adminRoutes } from './admin.js';
import { healthRoutes } from './health.js';
import { internalRoutes } from './internal.js';
import { sessionRoutes } from './sessions.js';

export async function registerRoutes(app: FastifyInstance) {
  await healthRoutes(app);
  await sessionRoutes(app);
  await adminRoutes(app);
  await internalRoutes(app);
}
