import { generateAtomFeed } from '@/lib/feed';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  return new Response(await generateAtomFeed(), {
    headers: {
      'Content-Type': 'application/atom+xml',
    },
  });
}
