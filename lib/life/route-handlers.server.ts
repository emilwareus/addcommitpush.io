import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { getLifeServerConfig } from './config.server';
import { LifeApiError } from './errors';
import {
  LIFE_SESSION_COOKIE,
  LifeSessionError,
  lifeSessionCookieOptions,
  requireLifeSession,
} from './session.server';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};

export async function requireLifeApiSession(): Promise<void> {
  await requireLifeSession();
}

export async function readLifeMutation<T>(request: Request, schema: ZodType<T>): Promise<T> {
  await requireLifeApiSession();
  const config = getLifeServerConfig();
  if (request.headers.get('origin') !== config.origin.origin) {
    throw new LifeApiError('invalid_request', 403, crypto.randomUUID());
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new LifeApiError('invalid_request', 415, crypto.randomUUID());
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(contentLength) || contentLength > 256_000) {
    throw new LifeApiError('invalid_request', 413, crypto.randomUUID());
  }
  const text = await request.text();
  if (text.length > 256_000) {
    throw new LifeApiError('invalid_request', 413, crypto.randomUUID());
  }
  const decoded: unknown = JSON.parse(text);
  return schema.parse(decoded);
}

export function privateJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
}

export async function lifeRouteError(error: unknown): Promise<NextResponse> {
  if (error instanceof LifeSessionError) {
    return privateJson(
      { error: { code: 'authentication_required', message: 'Authentication is required.' } },
      401
    );
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return privateJson(
      { error: { code: 'invalid_request', message: 'The request is invalid.' } },
      422
    );
  }
  if (error instanceof LifeApiError) {
    if (error.status === 401) {
      const cookieStore = await cookies();
      cookieStore.set(LIFE_SESSION_COOKIE, '', { ...lifeSessionCookieOptions, maxAge: 0 });
    }
    return privateJson(
      {
        error: { code: error.code, message: error.message, request_id: error.requestId },
      },
      error.status
    );
  }
  return privateJson(
    { error: { code: 'internal_error', message: 'The request could not be completed.' } },
    500
  );
}
