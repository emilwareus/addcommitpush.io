import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getLifeServerConfig } from './config.server';

export const LIFE_SESSION_COOKIE = '__Host-life_session';
export const LIFE_SESSION_SECONDS = 8 * 60 * 60;

const sessionPayloadSchema = z
  .object({
    sub: z.literal('life-owner'),
    iat: z.number().int().positive(),
    exp: z.number().int().positive(),
    nonce: z.string().uuid(),
  })
  .strict();

export type LifeSession = z.infer<typeof sessionPayloadSchema>;

export class LifeSessionError extends Error {
  constructor() {
    super('Life authentication is required.');
    this.name = 'LifeSessionError';
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const decoded = Buffer.from(value, 'base64url');
  const bytes = new Uint8Array(decoded.length);
  bytes.set(decoded);
  return bytes;
}

async function hmacKey() {
  const secret = new TextEncoder().encode(getLifeServerConfig().sessionSecret);
  return crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function issueLifeSession(now = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const payload: LifeSession = {
    sub: 'life-owner',
    iat: issuedAt,
    exp: issuedAt + LIFE_SESSION_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(encodedPayload)
  );
  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyLifeSession(
  value: string | undefined,
  now = new Date()
): Promise<LifeSession | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;

  try {
    const verified = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload)
    );
    if (!verified) return null;

    const decoded: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
    const payload = sessionPayloadSchema.parse(decoded);
    const nowSeconds = Math.floor(now.getTime() / 1_000);
    if (payload.exp <= nowSeconds || payload.iat > nowSeconds + 60) return null;
    if (payload.exp - payload.iat !== LIFE_SESSION_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getLifeSession(): Promise<LifeSession | null> {
  const cookieStore = await cookies();
  return verifyLifeSession(cookieStore.get(LIFE_SESSION_COOKIE)?.value);
}

export async function requireLifeSession(): Promise<LifeSession> {
  const session = await getLifeSession();
  if (!session) throw new LifeSessionError();
  return session;
}

export const lifeSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: LIFE_SESSION_SECONDS,
};
