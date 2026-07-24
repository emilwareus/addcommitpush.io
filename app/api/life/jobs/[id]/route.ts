import { uuidSchema } from '@/lib/life/contracts';
import { getIngestionJob } from '@/lib/life/queries.server';
import {
  ingestionJobView,
  lifeRouteError,
  privateJson,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireLifeApiSession();
    const id = uuidSchema.parse((await context.params).id);
    return privateJson(ingestionJobView(await getIngestionJob(id)));
  } catch (error) {
    return lifeRouteError(error);
  }
}
