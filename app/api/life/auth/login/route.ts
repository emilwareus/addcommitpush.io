import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyLifePassword } from '@/lib/life/auth.server';
import { getLifeServerConfig } from '@/lib/life/config.server';
import { loginRequestSchema } from '@/lib/life/contracts';
import { getOwner } from '@/lib/life/queries.server';
import {
  LIFE_SESSION_COOKIE,
  issueLifeSession,
  lifeSessionCookieOptions,
} from '@/lib/life/session.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function validNextPath(value: string | undefined): string | null {
  if (!value || value.startsWith('//')) return null;
  const url = new URL(value, 'https://life.invalid');
  if (
    url.origin !== 'https://life.invalid' ||
    (url.pathname !== '/life' && !url.pathname.startsWith('/life/'))
  ) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function genericFailure(): NextResponse {
  return NextResponse.json(
    { error: { code: 'invalid_credentials', message: 'Sign-in failed.' } },
    { status: 401, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const config = getLifeServerConfig();
    if (request.headers.get('origin') !== config.origin.origin) return genericFailure();
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
      return genericFailure();
    }
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(contentLength) || contentLength > 4_096) return genericFailure();
    const text = await request.text();
    if (text.length > 4_096) return genericFailure();
    const input = loginRequestSchema.parse(JSON.parse(text) as unknown);
    const nextPath = validNextPath(input.next);
    if (input.next && !nextPath) return genericFailure();
    if (!(await verifyLifePassword(input.password, config.passwordHash))) return genericFailure();

    const owner = await getOwner();
    if (owner.id !== config.expectedOwnerId) return genericFailure();

    const cookieStore = await cookies();
    cookieStore.set(LIFE_SESSION_COOKIE, await issueLifeSession(), lifeSessionCookieOptions);
    return NextResponse.redirect(new URL(nextPath ?? '/life', config.origin), 303);
  } catch {
    return genericFailure();
  }
}
