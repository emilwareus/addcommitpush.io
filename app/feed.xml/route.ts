import { generateRssFeed } from '@/lib/feed';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  return new Response(await generateRssFeed(), {
    headers: {
      'Content-Type': 'application/rss+xml',
    },
  });
}
