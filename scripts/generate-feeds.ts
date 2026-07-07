#!/usr/bin/env tsx

import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAllPosts, type Post } from '../lib/posts';
import { siteConfig } from '../lib/site';

interface AudioEnclosure {
  url: string;
  length: number;
  type: 'audio/mpeg';
}

interface FeedEntry {
  title: string;
  slug: string;
  description: string;
  url: string;
  publishedAt: Date;
  updatedAt: Date;
  tags: string[];
  audioEnclosure?: AudioEnclosure;
}

const outputDirectory = path.join(process.cwd(), 'public');

function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteConfig.url).toString();
}

function parsePostDate(value: string): Date {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid post date: ${value}`);
  }

  return date;
}

function getPostUpdatedAt(post: Post): Date {
  if (post.updatedAt) {
    return parsePostDate(post.updatedAt);
  }

  return parsePostDate(post.publishedAt);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

async function getAudioEnclosure(post: Post): Promise<AudioEnclosure | undefined> {
  if (!post.audioUrl) {
    return undefined;
  }

  const filePath = path.join(outputDirectory, post.audioUrl.replace(/^\//, ''));
  const fileStats = await stat(filePath);

  return {
    url: absoluteUrl(post.audioUrl),
    length: fileStats.size,
    type: 'audio/mpeg',
  };
}

async function getFeedEntries(): Promise<FeedEntry[]> {
  const posts = getAllPosts();

  return Promise.all(
    posts.map(async (post) => ({
      title: post.title,
      slug: post.slug,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedAt: parsePostDate(post.publishedAt),
      updatedAt: getPostUpdatedAt(post),
      tags: post.tags ?? [],
      audioEnclosure: await getAudioEnclosure(post),
    }))
  );
}

function getLatestUpdatedAt(entries: FeedEntry[]): Date {
  return new Date(Math.max(...entries.map((entry) => entry.updatedAt.getTime())));
}

function renderRssItem(entry: FeedEntry): string {
  const categories = entry.tags
    .map((tag) => `      <category>${escapeXml(tag)}</category>`)
    .join('\n');
  const enclosure = entry.audioEnclosure
    ? `\n      <enclosure url="${escapeXml(entry.audioEnclosure.url)}" length="${entry.audioEnclosure.length}" type="${entry.audioEnclosure.type}" />`
    : '';

  return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.url)}</link>
      <guid isPermaLink="true">${escapeXml(entry.url)}</guid>
      <pubDate>${entry.publishedAt.toUTCString()}</pubDate>
      <description>${cdata(entry.description)}</description>${categories ? `\n${categories}` : ''}${enclosure}
    </item>`;
}

function renderRss(entries: FeedEntry[]): string {
  const lastUpdatedAt = getLatestUpdatedAt(entries);
  const items = entries.map(renderRssItem).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(siteConfig.url)}</link>
    <atom:link href="${escapeXml(absoluteUrl(siteConfig.feeds.rss))}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en</language>
    <lastBuildDate>${lastUpdatedAt.toUTCString()}</lastBuildDate>
    <generator>addcommitpush.io feed generator</generator>
${items}
  </channel>
</rss>
`;
}

function renderAtomEntry(entry: FeedEntry): string {
  const categories = entry.tags
    .map((tag) => `    <category term="${escapeXml(tag)}" />`)
    .join('\n');
  const enclosure = entry.audioEnclosure
    ? `\n    <link rel="enclosure" href="${escapeXml(entry.audioEnclosure.url)}" type="${entry.audioEnclosure.type}" length="${entry.audioEnclosure.length}" />`
    : '';

  return `  <entry>
    <title>${escapeXml(entry.title)}</title>
    <id>${escapeXml(entry.url)}</id>
    <link rel="alternate" href="${escapeXml(entry.url)}" />
    <published>${entry.publishedAt.toISOString()}</published>
    <updated>${entry.updatedAt.toISOString()}</updated>
    <summary type="html">${escapeXml(entry.description)}</summary>${categories ? `\n${categories}` : ''}${enclosure}
  </entry>`;
}

function renderAtom(entries: FeedEntry[]): string {
  const lastUpdatedAt = getLatestUpdatedAt(entries);
  const atomEntries = entries.map(renderAtomEntry).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.title)}</title>
  <subtitle>${escapeXml(siteConfig.description)}</subtitle>
  <id>${escapeXml(siteConfig.url)}</id>
  <link rel="alternate" href="${escapeXml(siteConfig.url)}" />
  <link rel="self" href="${escapeXml(absoluteUrl(siteConfig.feeds.atom))}" type="application/atom+xml" />
  <updated>${lastUpdatedAt.toISOString()}</updated>
  <author>
    <name>${escapeXml(siteConfig.author.name)}</name>
    <email>${escapeXml(siteConfig.author.email)}</email>
  </author>
${atomEntries}
</feed>
`;
}

async function main() {
  const entries = await getFeedEntries();

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'feed.xml'), renderRss(entries));
  await writeFile(path.join(outputDirectory, 'feed.atom'), renderAtom(entries));

  console.log(`Generated ${entries.length} posts in public/feed.xml and public/feed.atom`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
