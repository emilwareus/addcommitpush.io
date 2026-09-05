import { LifeApiError } from '@/lib/life/errors';
import { downloadOwnerExport } from '@/lib/life/queries.server';
import { lifeRouteError, requireLifeApiSession } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await requireLifeApiSession();
    const upstream = await downloadOwnerExport('json');
    if (!upstream.headers.get('content-type')?.startsWith('application/json')) {
      throw new LifeApiError('invalid_upstream_response', 502, crypto.randomUUID());
    }
    return new Response(upstream.body, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'attachment; filename="life-export.json"',
        'Content-Type': 'application/json; charset=utf-8',
        Vary: 'Cookie',
      },
    });
  } catch (error) {
    return lifeRouteError(error);
  }
}
