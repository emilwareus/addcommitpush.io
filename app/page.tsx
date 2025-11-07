import { BlogCard } from "@/components/blog-card"

const blogPosts = [
  {
    id: "1",
    title: "How to Find and Hire Great Engineers",
    excerpt:
      "As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers. In this post, I want to share my insights, tips and tricks, and tactics to succeed in recruiting software developers, data engineers/scientists, and other related software roles in the context of a tech startup.",
    date: "2024-03-15",
    readTime: "12 min read",
    audioUrl: "/audio/post-1.mp3",
    tags: ["Leadership", "Recruitment", "Startups"],
  },
  {
    id: "2",
    title: "My Journey at Debricked: From ML Engineer to Co-Founder",
    excerpt:
      "In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and Sales with the perception that the SaaS product was 'done' and ready to take on the world. We just needed to add some more ML-enabled capabilities and off we go! We were wrong.. so so wrong.",
    date: "2023-11-20",
    readTime: "10 min read",
    audioUrl: "/audio/post-2.mp3",
    tags: ["Startups", "Personal", "Tech"],
  },
  {
    id: "3",
    title: "Welcome to addcommitpush.io",
    excerpt:
      "This blog is intended to be my small piece of the internet, where I can write down some of my learnings and reflections for others to read. I hope you'll enjoy it!",
    date: "2023-03-25",
    readTime: "2 min read",
    audioUrl: "/audio/post-3.mp3",
    tags: ["Personal", "Intro"],
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance">
              <span className="text-primary neon-glow">[add commit push]</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl text-pretty leading-relaxed">
              A blog about tech, data, leadership, and startups. Maintained by Emil Wåreus. Every post comes with
              audio—because reading is so 2020.
            </p>
          </div>

          <div className="space-y-8 md:space-y-10">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
