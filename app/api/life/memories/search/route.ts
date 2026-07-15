import { searchRequestSchema } from '@/lib/life/contracts';
import { searchMemories } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const input = await readLifeMutation(request, searchRequestSchema);
    return privateJson(await searchMemories(input));
  } catch (error) {
    return lifeRouteError(error);
  }
}
