import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

export function readInsightArticle(articlePath: string) {
  const normalizedArticlePath = normalize(articlePath);

  if (normalizedArticlePath.startsWith('..') || normalizedArticlePath.startsWith('/')) {
    throw new Error(`Invalid insight article path: ${articlePath}`);
  }

  return readFileSync(join(process.cwd(), normalizedArticlePath), 'utf8');
}
