import 'server-only';
import { z } from 'zod';

const httpsUrlSchema = z
  .string()
  .url()
  .transform((value) => new URL(value))
  .refine((value) => value.protocol === 'https:', 'URL must use HTTPS')
  .refine(
    (value) => value.href === `${value.origin}/`,
    'URL must be an origin without credentials, path, query, or fragment'
  );

const lifeConfigSchema = z
  .object({
    LIFE_API_BASE_URL: httpsUrlSchema,
    LIFE_USER_TOKEN: z.string().min(32),
    LIFE_EXPECTED_OWNER_ID: z.string().uuid(),
    LIFE_UI_PASSWORD_HASH: z.string().min(64),
    LIFE_UI_SESSION_SECRET: z.string().min(32),
    LIFE_UI_ORIGIN: httpsUrlSchema,
  })
  .strict();

export interface LifeServerConfig {
  apiBaseUrl: URL;
  userToken: string;
  expectedOwnerId: string;
  passwordHash: string;
  sessionSecret: string;
  origin: URL;
}

let parsedConfig: LifeServerConfig | undefined;

export function getLifeServerConfig(): LifeServerConfig {
  if (parsedConfig) return parsedConfig;

  const values = lifeConfigSchema.parse({
    LIFE_API_BASE_URL: process.env.LIFE_API_BASE_URL,
    LIFE_USER_TOKEN: process.env.LIFE_USER_TOKEN,
    LIFE_EXPECTED_OWNER_ID: process.env.LIFE_EXPECTED_OWNER_ID,
    LIFE_UI_PASSWORD_HASH: process.env.LIFE_UI_PASSWORD_HASH,
    LIFE_UI_SESSION_SECRET: process.env.LIFE_UI_SESSION_SECRET,
    LIFE_UI_ORIGIN: process.env.LIFE_UI_ORIGIN,
  });

  parsedConfig = {
    apiBaseUrl: values.LIFE_API_BASE_URL,
    userToken: values.LIFE_USER_TOKEN,
    expectedOwnerId: values.LIFE_EXPECTED_OWNER_ID,
    passwordHash: values.LIFE_UI_PASSWORD_HASH,
    sessionSecret: values.LIFE_UI_SESSION_SECRET,
    origin: values.LIFE_UI_ORIGIN,
  };
  return parsedConfig;
}
