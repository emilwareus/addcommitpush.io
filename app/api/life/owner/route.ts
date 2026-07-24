import { updateOwnerRequestSchema } from '@/lib/life/contracts';
import { getOwner, updateOwner } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  requireLifeApiSession,
  readLifeMutation,
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

export async function PUT(request: Request) {
  try {
    const input = await readLifeMutation(request, updateOwnerRequestSchema);
    return privateJson(await updateOwner(input));
  } catch (error) {
    return lifeRouteError(error);
  }
}
