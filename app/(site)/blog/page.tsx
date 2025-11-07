import { BlogCard } from "@/components/blog-card"
import { getAllPosts } from "@/lib/posts"

export const dynamic = "error"
export const revalidate = false

export const metadata = {
  title: "Blog | addcommitpush.io",
  description:
    "A blog about tech, data, leadership, and startups. Maintained by Emil Wåreus. Every post comes with audio—because reading is so 2020.",
}

export default function BlogPage() {
  const blogPosts = getAllPosts()

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance">
              <span className="text-primary neon-glow">Blog Posts</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl text-pretty leading-relaxed">
              A blog about tech, data, leadership, and startups. Maintained by Emil Wåreus. Every post comes with
              audio—because reading is so 2020.
            </p>
          </div>

          <div className="space-y-8 md:space-y-10">
            {blogPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
