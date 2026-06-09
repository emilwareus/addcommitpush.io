import { insightArticles } from '@/lib/generated/insight-articles';

const insightArticleRootPrefixes = [
  'presentations/write-code-ai-agents-love/research/insights/',
  'presentations/voice-agents/research/drafts/',
] as const;

export function readInsightArticle(articlePath: string) {
  const normalizedArticlePath = articlePath.replaceAll('\\', '/');
  const pathSegments = normalizedArticlePath.split('/');

  if (
    normalizedArticlePath.startsWith('/') ||
    pathSegments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid insight article path: ${articlePath}`);
  }

  const articleRootPrefix = insightArticleRootPrefixes.find((prefix) => {
    return normalizedArticlePath.startsWith(prefix);
  });

  if (!articleRootPrefix) {
    throw new Error(`Invalid insight article path: ${articlePath}`);
  }

  const articleFileName = normalizedArticlePath.slice(articleRootPrefix.length);

  if (
    !articleFileName.endsWith('.md') ||
    articleFileName.includes('/') ||
    articleFileName.startsWith('.')
  ) {
    throw new Error(`Invalid insight article filename: ${articlePath}`);
  }

  const insightArticle = insightArticles[normalizedArticlePath];

  if (!insightArticle) {
    throw new Error(`Missing generated insight article: ${articlePath}`);
  }

  return insightArticle;
}
