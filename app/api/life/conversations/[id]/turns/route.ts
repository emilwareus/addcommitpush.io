import { conversationTurnRequestSchema, uuidSchema } from '@/lib/life/contracts';
import { sendConversationTurn } from '@/lib/life/queries.server';
import { lifeRouteError, privateJson, readLifeMutation } from '@/lib/life/route-handlers.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = uuidSchema.parse((await context.params).id);
    const input = await readLifeMutation(request, conversationTurnRequestSchema);
    return privateJson(await sendConversationTurn(id, input));
  } catch (error) {
    return lifeRouteError(error);
  }
}
