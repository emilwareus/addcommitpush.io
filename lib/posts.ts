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
}

const posts: Post[] = [
  {
    title: 'Valkompass.ai - Transparent demokrati med AI',
    slug: 'valkompass-ai-transparent-demokrati',
    description:
      'Hur vi bygger ett verktyg för att göra svensk politik mer tillgänglig genom AI-driven analys av officiella dokument, helt transparent och öppet.',
    publishedAt: '2025-11-12',
    tags: ['ai', 'demokrati', 'open-source', 'sverige'],
    readTime: '5 min read',
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
      'Lessons learned from building Debricked as a co-founder, covering customer validation, execution prioritization, data-driven culture, conviction-based building, and focus strategies.',
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
      'How to structure, compact, and orchestrate information with commands, agents, and scripts.',
    publishedAt: '2025-11-07',
    tags: ['ai', 'agents', 'workflows', 'research'],
    cover: '/posts/context-engineering-claude-code/cover-optimized.webp',
    readTime: '10 min read',
    audioUrl: '/posts/context-engineering-claude-code/audio.mp3',
  },
  {
    title: 'Diffusion Deep Research',
    slug: 'diffusion-deep-research',
    description: 'How diffusion can be used to create a deep research report.',
    publishedAt: '2025-12-05',
    tags: ['ai', 'agents', 'research', 'deep-research'],
    cover: '/posts/diffusion-deep-research/cover-optimized.webp',
    readTime: '15 min read',
  },
];

export function getAllPosts(): Post[] {
  return posts.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find((post) => post.slug === slug) || null;
}

export function getAllSlugs(): string[] {
  return posts.map((post) => post.slug);
}
