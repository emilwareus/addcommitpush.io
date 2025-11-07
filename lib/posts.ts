export interface Post {
  title: string
  slug: string
  description: string
  publishedAt: string
  updatedAt?: string
  tags?: string[]
  cover?: string
  readTime: string
  audioUrl?: string
}

const posts: Post[] = [
  {
    title: "Recruiting engineers as a startup",
    slug: "recruiting-engineers-as-a-startup",
    description:
      "As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers.",
    publishedAt: "2023-03-25",
    updatedAt: "2023-03-25",
    tags: ["startup", "leadership", "software"],
    cover: "/posts/recruiting-engineers-as-a-startup/cover-optimized.webp",
    readTime: "8 min read",
    // audioUrl: "/audio/recruiting-engineers.mp3",
  },
]

export function getAllPosts(): Post[] {
  return posts.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find((post) => post.slug === slug) || null
}

export function getAllSlugs(): string[] {
  return posts.map((post) => post.slug)
}
