import { healthMeasurementInputSchema } from '@/lib/life/contracts';
import { createHealthMeasurement, listHealthMeasurements } from '@/lib/life/queries.server';
import {
  lifeRouteError,
  privateJson,
  readLifeMutation,
  requireLifeApiSession,
} from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await requireLifeApiSession();
    return privateJson(await listHealthMeasurements());
  } catch (error) {
    return lifeRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readLifeMutation(request, healthMeasurementInputSchema);
    return privateJson(await createHealthMeasurement(input), 201);
  } catch (error) {
    return lifeRouteError(error);
  }
}
