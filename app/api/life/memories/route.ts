import { listMemoriesQuerySchema, memoryInputSchema } from '@/lib/life/contracts';
import { createMemory, listMemories } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  readLifeMutation,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await requireLifeApiSession();
    const url = new URL(request.url);
    const query = listMemoriesQuerySchema.parse(Object.fromEntries(url.searchParams));
    return privateJson(await listMemories(query));
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readLifeMutation(request, memoryInputSchema);
    return privateJson(await createMemory(input), 201);
  } catch (error) {
    return lifeRouteError(error);
  }
}
