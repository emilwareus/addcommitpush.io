import { resolveContradictionRequestSchema, uuidSchema } from '@/lib/life/contracts';
import { getContradiction, resolveContradiction } from '@/lib/life/queries.server';
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
    return privateJson(await getContradiction(id));
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = uuidSchema.parse((await context.params).id);
    const input = await readLifeMutation(request, resolveContradictionRequestSchema);
    return privateJson(await resolveContradiction(id, input));
  } catch (error) {
    return lifeRouteError(error);
  }
}
