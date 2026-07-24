import { NextRequest, NextResponse } from 'next/server';
import { LIFE_SESSION_COOKIE, verifyLifeSession } from '@/lib/life/session.server';

const LIFE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com",
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  Vary: 'Cookie',
};

function withLifeHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(LIFE_HEADERS)) response.headers.set(name, value);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/life/login';
  const isLoginHandler = pathname === '/api/life/auth/login';
  if (isLoginPage || isLoginHandler) return withLifeHeaders(NextResponse.next());

  const session = await verifyLifeSession(request.cookies.get(LIFE_SESSION_COOKIE)?.value);
  if (session) return withLifeHeaders(NextResponse.next());

  if (pathname.startsWith('/api/life')) {
    return withLifeHeaders(
      NextResponse.json(
        { error: { code: 'authentication_required', message: 'Authentication is required.' } },
        { status: 401 }
      )
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/life/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return withLifeHeaders(NextResponse.redirect(loginUrl, 303));
}

export const config = {
  matcher: ['/life/:path*', '/api/life/:path*'],
};
