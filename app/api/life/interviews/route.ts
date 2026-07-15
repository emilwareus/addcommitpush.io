import { createInterviewRequestSchema } from '@/lib/life/contracts';
import { createInterview } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const input = await readLifeMutation(request, createInterviewRequestSchema);
    return privateJson(await createInterview(input), 201);
  } catch (error) {
    return lifeRouteError(error);
  }
}
