import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { getPostBySlug, getAllSlugs } from "@/lib/posts"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BlogHeading, BlogList, BlogListItem, Figure } from "@/components/custom"

export const dynamic = "error"
export const revalidate = false

export async function generateStaticParams() {
  const slugs = getAllSlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {
      title: "Post Not Found | addcommitpush.io",
    }
  }

  return {
    title: `${post.title} | addcommitpush.io`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: ["Emil Wåreus"],
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (slug !== "recruiting-engineers-as-a-startup") {
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
              <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
                <span>»</span>
                <Link href="/blog" className="hover:text-foreground">
                  Posts
                </Link>
              </nav>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance leading-tight">
                Recruiting engineers as a startup
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-8">
                <time dateTime="2023-03-25">March 25, 2023</time>
                <span>·</span>
                <span>8 min</span>
                <span>·</span>
                <span>1691 words</span>
                <span>·</span>
                <span>Emil Wåreus</span>
              </div>
            </header>

            <Figure
              src="/posts/recruiting-engineers-as-a-startup/cover.png"
              alt="Synthwave hacker, engineering recruitment"
              width={1200}
              height={630}
              caption="Great engineer to recruit"
              priority
              className="mb-12"
            />

            <div
              className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
                prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
                prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-accent
                prose-ul:text-foreground prose-ul:my-6
                prose-li:text-foreground prose-li:my-2"
            >
              <BlogHeading level={1}>Intro</BlogHeading>

              <p>
                As someone who&apos;s worked as a data lead or head of engineering for the past years, I&apos;ve learned a lot
                about finding and hiring great engineers. In this post, I want to share my insights, tips and tricks,
                and tactics to succeed in recruiting software developers, data engineers/scientists, and other related
                software roles in the context of a tech startup.
              </p>

              <BlogHeading level={3}>What will you get to read</BlogHeading>

              <BlogList variant="unordered">
                <BlogListItem>Recruitment process</BlogListItem>
                <BlogListItem>How I evaluate candidates</BlogListItem>
                <BlogListItem>How to find good candidates</BlogListItem>
              </BlogList>

              <p>
                This blogpost is written from the perspective of a head/VP of engineering, CTO, or similar at a small
                startup.
              </p>

              <BlogHeading level={1}>The process</BlogHeading>

              <BlogHeading level={2}>Interview with you</BlogHeading>

              <p>
                The first meeting with you is crucial: it&apos;s 50% about you evaluating the candidate and 50% about trying
                to get them excited to work for you. I look for three things in my candidates during the first
                interview:
              </p>

              <BlogList variant="unordered">
                <BlogListItem>
                  Passion for our field, technology, or anything, really. If a candidate has a sense of wonder and
                  curiosity, and uses that to explore, it&apos;s awesome to work with them as a manager. If you can direct
                  passion into a productive path, you&apos;ll have a fantastic team member in this candidate!
                </BlogListItem>
                <BlogListItem>
                  Ability to communicate hard problems, and read the room when they need to change their approach in
                  their explanation.
                </BlogListItem>
                <BlogListItem>Ability to reflect on their own performance in a constructive and insightful way.</BlogListItem>
              </BlogList>

              <p>
                To find these traits, I ask them to &quot;tell me about a project they have done.&quot; It could be a spare-time
                project, school project, or work thing—it doesn&apos;t really matter. I then ask a lot of follow-up
                questions! I let them explain the hard and tricky details, ask them if they made mistakes, why those
                mistakes were made, and what they would do differently in the future to avoid those mistakes. People are
                usually excited about their projects, and this usually becomes a great conversation.
              </p>

              <p>
                Next, I showcase all the &quot;cool things we do&quot; as a startup, demo our product, and explain how fun it was
                to solve some of the cool problems we&apos;re working on. I look for follow-up questions from the candidate.
                Do they get excited when I say we use graph databases? Do they start pitching ideas for improvements?
              </p>

              <p>
                Finally, I wrap up this interview by going over the full process, benefits, and discussing our culture
                and what it&apos;s like to work for us.
              </p>

              <BlogHeading level={3}>Case</BlogHeading>

              <p>
                The case is a topic of much debate, but in my experience, I prefer assigning home assignments where the
                candidate has one week to solve a problem and return their results and code. A case should take no
                longer than 4-5 hours, preferably closer to 3 hours. It is essential to test the actual qualities you
                are looking for, rather than just the quality of the code. For example, I typically look for someone who
                can solve problems under uncertain or ambiguous descriptions, so I intentionally keep the case
                open-ended to see if the candidate will make the necessary assumptions and reach a final result.
                Additionally, I expect candidates to have a good understanding of the domain they are working in, so it
                can be beneficial if they research your problem, read up on the domain, and gain extra knowledge that
                can help solve the case. For instance, in my case at Debricked, I mention &quot;different vulnerability
                types,&quot; which directly translates to the Common Weakness Enumeration (CWE) standard. If a candidate
                spends five minutes googling, they will likely find the standard and have a significant advantage in my
                case.
              </p>

              <p>
                In addition, it is crucial that the case is representative of the work the candidate will be doing.
                Generic programming cases can be dull and may not accurately reflect the skills needed for the job.
                Instead, ask them to use the frameworks you use, ensure the problem is within your domain, and
                incorporate a genuine business issue into the case.
              </p>

              <p>
                Furthermore, the case should be exciting and enjoyable! If the candidate responds positively with, &quot;If I
                get to solve these types of problems at your company, that would be fantastic!&quot;, that&apos;s ideal! Most
                cases can be tedious and unengaging, so making yours fun and intriguing can give you an edge in the
                competitive hiring landscape for software engineers.
              </p>

              <p>
                But what about not having a case at all? In my opinion, the best indicator of a good hire is a
                successful result from the case, and it also demonstrates the seriousness of the hiring process to the
                candidate. Hiring exceptional engineers requires thoroughness in the hiring process, and promising the
                candidate that all their future colleagues will be outstanding engineers is an excellent selling point.
              </p>

              <BlogHeading level={3}>Second interview</BlogHeading>

              <p>
                The second interview is a critical step to obtain a second opinion and mitigate the risks of a bad hire.
                Investing time and effort in the hiring process can save significant expenses down the road. Depending
                on the position, I conduct the second interview either with another manager or a potential teammate.
                This interview can be more relaxed, with the aim of assessing the candidate&apos;s cultural fit within the
                team.
              </p>

              <p>
                During the second interview, it is essential to ask open-ended questions that allow the candidate to
                share their experiences and work style. Additionally, it&apos;s an opportunity to clarify any questions or
                concerns that may have arisen during the initial interview.
              </p>

              <p>
                The selection of the interviewer for the second round depends on the role being hired for. Sometimes, I
                let another manager handle the interview, and in other cases, I may choose an engineer from the
                candidate&apos;s future team. If I am particularly impressed with a candidate and want to showcase our team
                and culture, I may opt for the engineer to conduct the interview. However, if I am seeking a second
                opinion, I usually ask another manager to conduct the interview. Of course, the opinions of the engineer
                and manager are not mutually exclusive. I value the input and opinions of both, especially regarding the
                candidate&apos;s technical skills and cultural fit within the team.
              </p>

              <BlogHeading level={3}>Close the candidate</BlogHeading>

              <p>
                I don&apos;t have any particular insights here, other than that if the candidate is excited to work for you,
                this should be easy! Just be clear and direct with the responsibilities of the role, and work swiftly in
                answering questions for the candidate. Speed is always of the essence in recruiting.
              </p>

              <BlogHeading level={1}>How do I find good candidates</BlogHeading>

              <BlogHeading level={3}>Collaboration with my local Uni</BlogHeading>

              <p>
                Thesis Projects: Having 1-3 thesis projects ongoing at all times can be an excellent way to showcase the
                best side of your company to potential candidates. It can also be an opportunity to build a relationship
                with the university and its students. Moreover, reaching out to your previous students who completed
                their thesis projects can be a valuable source of talent for your company, and they may be interested in
                joining your team if there are suitable job openings.
              </p>

              <p>
                Summer Workers and Interns: Another way to collaborate with universities is to offer internships and
                summer work programs. This can help you identify talented and motivated individuals who can bring new
                ideas and perspectives to your team. Additionally, it can be an excellent opportunity for students to
                gain practical experience and enhance their skills while providing your company with additional support
                during busy periods.
              </p>

              <p>
                To attract the best candidates from universities, it&apos;s crucial to showcase your company&apos;s values,
                culture, and work environment. Provide clear expectations, feedback, and growth opportunities to foster
                a positive work experience for interns and other students.
              </p>

              <BlogHeading level={3}>Friends</BlogHeading>

              <p>
                If you have close friends who possess the skills and qualities you&apos;re looking for, consider hiring them!
                While there are some risks associated with hiring friends, it can also be beneficial because both of you
                have skin in the game to succeed. Additionally, since you have a personal relationship with your friend,
                you both have a vested interest in maintaining that relationship, which can lead to greater
                accountability and dedication to success.
              </p>

              <p>
                In my opinion, hiring friends can provide an unfair advantage for both the employer and the friend, so
                it&apos;s worth tapping into this network when looking for potential candidates. Moreover, hiring friends can
                significantly reduce the cost of recruitment, as you may not need to interview as many candidates or
                review as many CVs. In my experience, some of the best hires I&apos;ve made have been through personal
                connections. However, it&apos;s important to always get a second opinion when hiring your buddies.
              </p>

              <BlogHeading level={3}>Generate a good reputation</BlogHeading>

              <p>
                A good reputation at local universities can be invaluable when it comes to attracting smart and talented
                junior hires. Consider partnering with universities by offering internships or sponsoring student
                projects to showcase your company&apos;s values and culture. Having great thesis projects, internships, and
                hackathons has worked best for me so far.
              </p>

              <p>
                Active participation in local dev-communities and conferences can also help create a positive
                reputation. Attend and participate in meetups, tech talks, and other industry events to build
                relationships and gain exposure to a broader pool of potential candidates. Additionally, speaking at
                conferences can help establish your company as a thought leader and attract interest from talented
                individuals who share similar interests and values.
              </p>

              <BlogHeading level={1}>TL;DR + Conclusion</BlogHeading>

              <p>
                As someone who&apos;s been fortunate enough to have had experience recruiting software engineers, data
                scientists, and other tech roles for the past years, I&apos;ve learned a thing or two about what works and
                what doesn&apos;t. It&apos;s a challenging process, but with a bit of luck and a lot of effort, I&apos;ve managed to
                find some great candidates along the way. During the initial interview, I try to get a sense of the
                candidate&apos;s passion, communication skills, and reflective abilities. And while I like to think that my
                case assignments are representative of the actual work they&apos;ll be doing, I&apos;m constantly learning and
                evolving my approach. When it comes to finding good candidates, I&apos;ve been fortunate to collaborate with
                my local university and offer internships and summer work programs. And while I&apos;ve occasionally hired my
                own friends, I always make sure to get a second opinion and not let personal bias cloud my judgment.
                Ultimately, I&apos;m just trying to do my best and make a positive impact on my company&apos;s growth, and I hope
                this post brought some insights to you as well!
              </p>
            </div>

            <footer className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  startup
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  leadership
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  software
                </Badge>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </main>
  )
}
