import { z } from 'zod';
import { uuidSchema } from '@/lib/life/contracts';
import { syncConnector } from '@/lib/life/queries.server';
import {
  ingestionJobView,
  lifeRouteError,
  privateJson,
  readLifeMutation,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await readLifeMutation(request, z.object({}).strict());
    const id = uuidSchema.parse((await context.params).id);
    return privateJson(ingestionJobView(await syncConnector(id)), 202);
  } catch (error) {
    return lifeRouteError(error);
  }
}
