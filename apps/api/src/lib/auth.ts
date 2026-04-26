import { jwtVerify } from 'jose';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';

export type AuthUser = {
  id: string;
  email?: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    accessToken?: string;
  }
}

function supabaseJwtKey(): Uint8Array {
  // Supabase uses HS256 with the raw JWT secret.
  return new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'missing_bearer_token' });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) return reply.code(401).send({ error: 'missing_bearer_token' });

  try {
    const { payload } = await jwtVerify(token, supabaseJwtKey(), {
      algorithms: ['HS256'],
    });

    const sub = payload.sub;
    if (!sub) return reply.code(401).send({ error: 'invalid_token' });

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    request.user = email ? { id: sub, email } : { id: sub };
    request.accessToken = token;
  } catch {
    return reply.code(401).send({ error: 'invalid_token' });
  }
}
