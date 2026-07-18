export interface Post {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  cover?: string;
  readTime: string;
  audioUrl?: string;
  draft?: boolean;
  canonicalUrl?: string;
  ogImage?: string;
}

const posts: Post[] = [
  {
    title: 'Static Analysis: A Developer\'s Tutorial',
    slug: 'static-analysis-tutorial',
    description:
      'A practical tutorial on static analysis: how parsers, control flow graphs, dataflow analysis, abstract interpretation, taint tracking, and type systems work together to find bugs without running code.',
    publishedAt: '2026-07-16',
    tags: ['static-analysis', 'software', 'tutorial'],
    cover: '/posts/static-analysis-tutorial/cover.svg',
    readTime: '25 min read',
  },
  {
    title: 'Write Code That AI Agents Love',
    slug: 'write-code-that-ai-agents-love',
    description:
      'A practical talk on making codebases easier for AI coding agents to orient, retrieve from, edit, and verify. Patterns, anti-patterns, and real examples.',
    publishedAt: '2026-06-09',
    tags: ['ai', 'agents', 'software'],
    readTime: '20 min read',
  },
  {
    title: 'Recruiting engineers as a startup',
    slug: 'recruiting-engineers-as-a-startup',
    description:
      "As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers.",
    publishedAt: '2023-03-25',
    updatedAt: '2023-03-25',
    tags: ['startup', 'leadership', 'software'],
    cover: '/posts/recruiting-engineers-as-a-startup/cover-optimized.webp',
    readTime: '8 min read',
    audioUrl: '/posts/recruiting-engineers-as-a-startup/audio.mp3',
  },
  {
    title: 'Building a SaaS Business, Zero to One in Hindsight',
    slug: 'saas-zero-to-one-hindsight',
    description:
      'Lessons from building Debricked: customer validation, execution priorities, a data-driven culture, conviction, and strategies for sustained focus.',
    publishedAt: '2022-12-27',
    updatedAt: '2022-12-27',
    tags: ['startup', 'saas', 'business'],
    cover: '/posts/saas-zero-to-one-hindsight/cover-optimized.avif',
    readTime: '10 min read',
  },
  {
    title: 'Advanced Context Engineering with Claude Code',
    slug: 'context-engineering-claude-code',
    description:
      'A practical guide to structuring, compacting, and orchestrating context with commands, agents, and scripts for reliable Claude Code workflows.',
    publishedAt: '2025-11-07',
    tags: ['ai', 'agents', 'workflows', 'research'],
    cover: '/posts/context-engineering-claude-code/cover-optimized.webp',
    readTime: '10 min read',
    audioUrl: '/posts/context-engineering-claude-code/audio.mp3',
  },
  {
    title: 'Diffusion Deep Research',
    slug: 'diffusion-deep-research',
    description:
      'Using diffusion models to generate deep research reports. A novel approach combining iterative denoising with multi-step reasoning for comprehensive analysis.',
    publishedAt: '2025-12-05',
    tags: ['ai', 'agents', 'research', 'deep-research'],
    cover: '/posts/diffusion-deep-research/cover-optimized.webp',
    readTime: '15 min read',
  },
];

export function getAllPosts(): Post[] {
  return posts
    .filter((post) => post.draft !== true)
    .sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find((post) => post.slug === slug && post.draft !== true) || null;
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}
