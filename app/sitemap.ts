import type { MetadataRoute } from 'next';
import { getAllPosts, type Post } from '@/lib/posts';
import { siteConfig } from '@/lib/site';

function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteConfig.url).toString();
}

function parseDate(value: string): Date {
  return new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
}

function getPostLastModified(post: Post): Date {
  if (post.updatedAt) {
    return parseDate(post.updatedAt);
  }

  return parseDate(post.publishedAt);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const buildTime = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: buildTime,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/brain'),
      lastModified: buildTime,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/presentations'),
      lastModified: buildTime,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: buildTime,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/status'),
      lastModified: buildTime,
      changeFrequency: 'daily',
      priority: 0.3,
    },
  ];

  const postRoutes = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: getPostLastModified(post),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
