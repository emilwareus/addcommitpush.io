import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lifeRouteError, readLifeMutation } from '@/lib/life/route-handlers.server';
import { LIFE_SESSION_COOKIE, lifeSessionCookieOptions } from '@/lib/life/session.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await readLifeMutation(request, z.object({}).strict());
    const cookieStore = await cookies();
    cookieStore.set(LIFE_SESSION_COOKIE, '', { ...lifeSessionCookieOptions, maxAge: 0 });
    return NextResponse.json(
      { redirect_to: '/life/login' },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (error) {
    return lifeRouteError(error);
  }
}
