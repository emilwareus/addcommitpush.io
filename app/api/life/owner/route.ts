import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyLifePassword } from '@/lib/life/auth.server';
import { getLifeServerConfig } from '@/lib/life/config.server';
import { deleteOwnerRequestSchema, updateOwnerRequestSchema } from '@/lib/life/contracts';
import { LifeApiError } from '@/lib/life/errors';
import { deleteOwner, getOwner, updateOwner } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  requireLifeApiSession,
  readLifeMutation,
} from '@/lib/life/route-handlers.server';
import { LIFE_SESSION_COOKIE, lifeSessionCookieOptions } from '@/lib/life/session.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await requireLifeApiSession();
    return privateJson(await getOwner());
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const input = await readLifeMutation(request, updateOwnerRequestSchema);
    return privateJson(await updateOwner(input));
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = await readLifeMutation(request, deleteOwnerRequestSchema);
    const config = getLifeServerConfig();
    if (!(await verifyLifePassword(input.password, config.passwordHash))) {
      throw new LifeApiError('invalid_request', 403, crypto.randomUUID());
    }
    await deleteOwner(input.confirm_display_name);
    const cookieStore = await cookies();
    cookieStore.set(LIFE_SESSION_COOKIE, '', { ...lifeSessionCookieOptions, maxAge: 0 });
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
    });
  } catch (error) {
    return lifeRouteError(error);
  }
}
