import { getOwner } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

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
