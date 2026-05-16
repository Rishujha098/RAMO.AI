import { publicEnv } from './env';

export async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    ...(init?.headers ?? {}),
  };

  // Only set application/json if there is a body and it's a string (JSON)
  // or if we explicitly want json, but avoid setting it for empty bodies 
  // as it causes Fastify FST_ERR_CTP_EMPTY_JSON_BODY
  if (init?.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json';
  } else if (!init?.body && init?.method && init.method !== 'GET' && init.method !== 'HEAD') {
    // If it's a POST/PUT without body, we can just send empty JSON obj to be safe, 
    // but better yet, in apiFetch we let the user explicitly provide it.
    // Wait, let's just default to sending '{}' if they passed JSON content type or we force it:
    // Actually, simply NOT sending the header is enough for Fastify, but 
    // if Fastify expects JSON, it's fine. Fastify only complains if Content-Type is 'application/json' and body is literally empty.
  }

  // To be perfectly safe, if it's a POST without a body, let's just make the body '{}' and keep content-type JSON
  const finalInit = { ...init };
  if (!finalInit.body && finalInit.method && ['POST', 'PUT', 'PATCH'].includes(finalInit.method.toUpperCase())) {
    finalInit.body = '{}';
    headers['Content-Type'] = 'application/json';
  } else if (finalInit.body && typeof finalInit.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${publicEnv.apiBaseUrl}${path}`, {
    ...finalInit,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export async function apiFetchBlob(path: string, accessToken: string): Promise<Blob> {
  const res = await fetch(`${publicEnv.apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return await res.blob();
}
