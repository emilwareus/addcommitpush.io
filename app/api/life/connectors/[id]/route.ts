import { z } from 'zod';
import { uuidSchema } from '@/lib/life/contracts';
import { revokeConnector } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await readLifeMutation(request, z.object({ confirm: z.literal('revoke') }).strict());
    const id = uuidSchema.parse((await context.params).id);
    return privateJson(await revokeConnector(id));
  } catch (error) {
    return lifeRouteError(error);
  }
}
