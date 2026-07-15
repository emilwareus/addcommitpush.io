import { z } from 'zod';
import { uuidSchema } from '@/lib/life/contracts';
import { resetConnectorCursor } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await readLifeMutation(
      request,
      z.object({ confirm: z.literal('reset Gmail cursor') }).strict()
    );
    const id = uuidSchema.parse((await context.params).id);
    return privateJson(await resetConnectorCursor(id));
  } catch (error) {
    return lifeRouteError(error);
  }
}
