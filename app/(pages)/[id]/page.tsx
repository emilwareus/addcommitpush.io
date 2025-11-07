import { notFound } from "next/navigation"
import { AudioPlayer } from "@/components/audio-player"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Mock blog data - replace with your actual data source
const blogPosts = {
  "1": {
    id: "1",
    title: "How to Find and Hire Great Engineers",
    content: `
      <p>As someone who's worked as a data lead or head of engineering for the past years, I've learned a lot about finding and hiring great engineers. In this post, I want to share my insights, tips and tricks, and tactics to succeed in recruiting software developers, data engineers/scientists, and other related software roles in the context of a tech startup.</p>

      <h2>Understanding What You Need</h2>
      <p>Before you start recruiting, you need to understand exactly what kind of engineer you're looking for. This goes beyond just the technical skills—it's about finding someone who fits your team culture and can grow with your company.</p>

      <h2>Where to Find Great Talent</h2>
      <p>The best engineers aren't always actively looking for jobs. You need to be proactive in your search, leveraging networks, communities, and building a strong employer brand that attracts top talent.</p>

      <h2>The Interview Process</h2>
      <p>A good interview process balances technical assessment with cultural fit. It should be challenging but fair, and give candidates a real sense of what it's like to work at your company.</p>

      <h2>Making the Offer</h2>
      <p>Once you've found the right person, don't lose them in the offer stage. Be competitive, be clear about growth opportunities, and move quickly.</p>
    `,
    date: "2024-03-15",
    readTime: "12 min read",
    audioUrl: "/audio/post-1.mp3",
    tags: ["Leadership", "Recruitment", "Startups"],
  },
  "2": {
    id: "2",
    title: "My Journey at Debricked: From ML Engineer to Co-Founder",
    content: `
      <p>In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and Sales with the perception that the SaaS product was 'done' and ready to take on the world. We just needed to add some more ML-enabled capabilities and off we go! We were wrong.. so so wrong.</p>

      <h2>The Beginning</h2>
      <p>Starting at Debricked was exciting. The product had potential, but we quickly realized that "done" was far from reality. Every customer conversation revealed new needs, new challenges, and new opportunities.</p>

      <h2>Learning Through Failure</h2>
      <p>We made mistakes. Lots of them. But each failure taught us something valuable about our customers, our product, and ourselves. The key was failing fast and learning faster.</p>

      <h2>Finding Product-Market Fit</h2>
      <p>It took time, experimentation, and countless iterations, but we eventually found what resonated with customers. It wasn't what we initially thought it would be, and that's okay.</p>

      <h2>Becoming a Co-Founder</h2>
      <p>About a year later, I was recognized as a Co-Founder. It was validation of the work we'd done together and the journey we'd been on. But it was also just the beginning of a new chapter.</p>
    `,
    date: "2023-11-20",
    readTime: "10 min read",
    audioUrl: "/audio/post-2.mp3",
    tags: ["Startups", "Personal", "Tech"],
  },
  "3": {
    id: "3",
    title: "Welcome to addcommitpush.io",
    content: `
      <p>This blog is intended to be my small piece of the internet, where I can write down some of my learnings and reflections for others to read. I hope you'll enjoy it!</p>

      <h2>Why This Blog?</h2>
      <p>I've learned a lot over the years working in tech, data, and startups. This blog is my way of sharing those learnings with others who might find them useful.</p>

      <h2>What to Expect</h2>
      <p>I'll be writing about tech, data, leadership, and startups. Some posts will be technical, others more reflective. All will be honest and based on real experiences.</p>

      <h2>Let's Connect</h2>
      <p>If you have suggestions for topics or just want to chat, feel free to reach out. This is meant to be a conversation, not a monologue.</p>
    `,
    date: "2023-03-25",
    readTime: "2 min read",
    audioUrl: "/audio/post-3.mp3",
    tags: ["Personal", "Intro"],
  },
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = blogPosts[id as keyof typeof blogPosts]

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-8 md:mb-12 -ml-2 md:-ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Blog</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>

          <article>
            <header className="mb-12 md:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-8 text-balance leading-tight">
                <span className="text-primary neon-glow">{post.title}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm sm:text-base text-muted-foreground mb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{post.readTime}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-10 md:mb-12">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>

              <AudioPlayer audioUrl={post.audioUrl} title={post.title} />
            </header>

            <div
              className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
                prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
                prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-accent"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        </div>
      </div>
    </main>
  )
}
