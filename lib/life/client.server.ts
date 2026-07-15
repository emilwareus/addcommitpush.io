import 'server-only';
import type { ZodType } from 'zod';
import { getLifeServerConfig } from './config.server';
import { errorEnvelopeSchema } from './contracts';
import { LifeApiError, mapLifeApiStatus } from './errors';

type LifeMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface LifeRequestOptions<T> {
  method: LifeMethod;
  path: `/v1/${string}`;
  schema: ZodType<T>;
  body?: unknown;
}

export async function lifeRequest<T>({
  method,
  path,
  schema,
  body,
}: LifeRequestOptions<T>): Promise<T> {
  const config = getLifeServerConfig();
  const url = new URL(path, config.apiBaseUrl);
  if (url.origin !== config.apiBaseUrl.origin || !url.pathname.startsWith('/v1/')) {
    throw new Error('Life API paths must remain under /v1/.');
  }

  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.userToken}`,
        'X-Request-ID': requestId,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new LifeApiError('upstream_unavailable', 503, requestId);
  }

  const correlatedRequestId = response.headers.get('x-request-id') ?? requestId;
  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(await response.json().catch(() => null));
    if (!parsedError.success) {
      throw new LifeApiError('invalid_upstream_response', 502, correlatedRequestId);
    }
    const code = mapLifeApiStatus(response.status);
    throw new LifeApiError(code, response.status, correlatedRequestId);
  }

  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new LifeApiError('invalid_upstream_response', 502, correlatedRequestId);
  }
  return parsed.data;
}
