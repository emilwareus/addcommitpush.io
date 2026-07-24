import 'server-only';
import { scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const passwordHashSchema = z
  .string()
  .regex(/^\$scrypt\$v=1\$N=\d+,r=\d+,p=\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
  salt: Buffer;
  expectedHash: Buffer;
}

function parsePasswordHash(encodedHash: string): ScryptParameters {
  const parsed = passwordHashSchema.parse(encodedHash);
  const [, , version, parameters, saltValue, hashValue] = parsed.split('$');
  if (version !== 'v=1') throw new Error('Unsupported Life password hash version.');

  const parameterEntries = Object.fromEntries(
    parameters.split(',').map((entry) => {
      const [key, value] = entry.split('=');
      return [key, Number(value)];
    })
  );
  const cost = parameterEntries.N;
  const blockSize = parameterEntries.r;
  const parallelization = parameterEntries.p;
  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelization) ||
    cost < 16_384 ||
    cost > 1_048_576 ||
    (cost & (cost - 1)) !== 0 ||
    blockSize < 8 ||
    blockSize > 32 ||
    parallelization < 1 ||
    parallelization > 8
  ) {
    throw new Error('Life password hash parameters are invalid.');
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedHash = Buffer.from(hashValue, 'base64url');
  if (salt.length < 16 || expectedHash.length < 32) {
    throw new Error('Life password hash material is too short.');
  }
  return { cost, blockSize, parallelization, salt, expectedHash };
}

export async function verifyLifePassword(password: string, encodedHash: string): Promise<boolean> {
  const parameters = parsePasswordHash(encodedHash);
  const maxmem = 256 * parameters.cost * parameters.blockSize;
  const actualHash = await new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      parameters.salt,
      parameters.expectedHash.length,
      {
        N: parameters.cost,
        r: parameters.blockSize,
        p: parameters.parallelization,
        maxmem,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
  return timingSafeEqual(actualHash, parameters.expectedHash);
}
