const wikiLinkPattern = /\[\[([^\]\n]+)\]\]/g;
const fencedCodeStartPattern = /^\s*(```|~~~)/;

export interface WikiLinkMatch {
  targetSlug: string;
  label: string;
}

function slugifyLinkTarget(target: string) {
  return target
    .trim()
    .split('#')[0]
    .trim()
    .toLowerCase()
    .replace(/\.(md|mdx)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseWikiLink(rawValue: string): WikiLinkMatch {
  const [target, label] = rawValue.split('|');
  const targetSlug = slugifyLinkTarget(target ?? '');

  if (!targetSlug) {
    throw new Error(`Invalid empty wikilink: [[${rawValue}]]`);
  }

  return {
    targetSlug,
    label: (label ?? target ?? '').trim(),
  };
}

function replaceWikiLinksInLine(
  line: string,
  publishedSlugs: ReadonlySet<string>,
  sourceLabel: string
) {
  return line.replace(wikiLinkPattern, (_, rawValue: string) => {
    const link = parseWikiLink(rawValue);

    if (!publishedSlugs.has(link.targetSlug)) {
      throw new Error(`Broken wikilink in ${sourceLabel}: [[${rawValue}]]`);
    }

    return `[${link.label}](/brain/${link.targetSlug})`;
  });
}

export function extractWikiLinks(markdown: string): WikiLinkMatch[] {
  const matches: WikiLinkMatch[] = [];
  let inFencedCode = false;

  markdown.split('\n').forEach((line) => {
    if (fencedCodeStartPattern.test(line)) {
      inFencedCode = !inFencedCode;
      return;
    }

    if (inFencedCode) {
      return;
    }

    for (const match of line.matchAll(wikiLinkPattern)) {
      matches.push(parseWikiLink(match[1] ?? ''));
    }
  });

  return matches;
}

export function renderWikiLinks(
  markdown: string,
  publishedSlugs: ReadonlySet<string>,
  sourceLabel: string
) {
  let inFencedCode = false;

  return markdown
    .split('\n')
    .map((line) => {
      if (fencedCodeStartPattern.test(line)) {
        inFencedCode = !inFencedCode;
        return line;
      }

      if (inFencedCode) {
        return line;
      }

      return replaceWikiLinksInLine(line, publishedSlugs, sourceLabel);
    })
    .join('\n');
}

export function extractFrontmatterWikiLinks(value: unknown): WikiLinkMatch[] {
  if (typeof value === 'string') {
    return extractWikiLinks(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractFrontmatterWikiLinks(item));
  }

  return [];
}
