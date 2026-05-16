import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { createSupabaseUserClient } from '../lib/supabase.js';

async function requireAdmin(app: FastifyInstance, accessToken: string, userId: string) {
  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('user_id', userId).single();
  if (error) {
    app.log.error({ err: error, userId }, 'requireAdmin db error');
    return false;
  }
  return Boolean(data?.is_admin);
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/v1/admin/users', { preHandler: requireAuth }, async (request, reply) => {
    const ok = await requireAdmin(app, request.accessToken!, request.user!.id);
    if (!ok) return reply.code(403).send({ error: 'forbidden' });

    const supabase = createSupabaseUserClient(request.accessToken!);
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, target_role, experience_level, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: 'db_error', details: error.message });
    return { users: data };
  });

  app.get('/v1/admin/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const ok = await requireAdmin(app, request.accessToken!, request.user!.id);
    if (!ok) return reply.code(403).send({ error: 'forbidden' });

    const supabase = createSupabaseUserClient(request.accessToken!);
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('id, user_id, role, experience_level, interview_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return reply.code(500).send({ error: 'db_error', details: error.message });
    return { sessions: data };
  });
}
