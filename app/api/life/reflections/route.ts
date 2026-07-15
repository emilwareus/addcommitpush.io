import { reflectionRequestSchema } from '@/lib/life/contracts';
import { createReflection } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const input = await readLifeMutation(request, reflectionRequestSchema);
    return privateJson(await createReflection(input), 201);
  } catch (error) {
    return lifeRouteError(error);
  }
}
