import { z } from 'zod';
import { uuidSchema } from '@/lib/life/contracts';
import { closeRealtimeSession, getRealtimeSession } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  readLifeMutation,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireLifeApiSession();
    const id = uuidSchema.parse((await context.params).id);
    return privateJson(await getRealtimeSession(id));
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const id = uuidSchema.parse((await context.params).id);
    await readLifeMutation(request, z.object({}).strict());
    return privateJson(await closeRealtimeSession(id));
  } catch (error) {
    return lifeRouteError(error);
  }
}
