import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const bearerHeaderName = 'authorization';
const expectedPrefix = 'Bearer ';
const cronHeaderName = 'x-vercel-cron';

function isAuthorized(req: Request, secret: string | undefined): boolean {
  const cronHeader = req.headers.get(cronHeaderName);
  if (cronHeader) return true; // allow Vercel Cron jobs

  const authHeader = req.headers.get(bearerHeaderName);
  if (!secret || !authHeader || !authHeader.startsWith(expectedPrefix)) return false;
  const token = authHeader.slice(expectedPrefix.length);
  return token === secret;
}

export async function GET(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!isAuthorized(req, secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  await Promise.all([
    revalidateTag('github-api', {}),
    revalidateTag('linear-api', {}),
    revalidatePath('/status', 'page'),
  ]);

  return NextResponse.json({
    ok: true,
    revalidated: true,
    at: new Date().toISOString(),
  });
}
