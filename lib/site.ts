import type { Metadata } from 'next';

type MetadataAlternates = NonNullable<Metadata['alternates']>;
type FeedAlternates = NonNullable<MetadataAlternates['types']>;

export const siteConfig = {
  name: 'addcommitpush.io',
  title: 'addcommitpush.io - Emil Wåreus',
  description:
    'Tech blog by Emil Wåreus. Head of Engineering and Research. Writing about machine learning, data engineering, leadership, and startups.',
  url: 'https://addcommitpush.io',
  author: {
    name: 'Emil Wåreus',
    email: 'emil@addcommitpush.io',
  },
  feeds: {
    rss: '/feed.xml',
    atom: '/feed.atom',
  },
} as const;

export const feedAlternates: FeedAlternates = {
  'application/rss+xml': [
    {
      title: `${siteConfig.name} RSS Feed`,
      url: siteConfig.feeds.rss,
    },
  ],
  'application/atom+xml': [
    {
      title: `${siteConfig.name} Atom Feed`,
      url: siteConfig.feeds.atom,
    },
  ],
};
