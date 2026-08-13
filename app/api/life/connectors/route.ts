import { connectConnector } from '@/lib/life/queries.server';
import { connectConnectorRequestSchema } from '@/lib/life/contracts';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await readLifeMutation(request, connectConnectorRequestSchema);
    return privateJson(await connectConnector(body), 201);
  } catch (error) {
    return lifeRouteError(error);
  }
}
