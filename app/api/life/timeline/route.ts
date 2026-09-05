import { timelineQuerySchema } from '@/lib/life/contracts';
import { getTimeline } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await requireLifeApiSession();
    const query = timelineQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return privateJson(await getTimeline(query));
  } catch (error) {
    return lifeRouteError(error);
  }
}
