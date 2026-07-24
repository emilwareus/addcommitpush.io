import { z } from 'zod';
import { CONNECTOR_PROVIDERS } from '@/lib/life/constants';
import { startConnectorOAuth } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await readLifeMutation(request, z.object({}).strict());
    const provider = z.enum(CONNECTOR_PROVIDERS).parse((await context.params).id);
    return privateJson(await startConnectorOAuth(provider));
  } catch (error) {
    return lifeRouteError(error);
  }
}
