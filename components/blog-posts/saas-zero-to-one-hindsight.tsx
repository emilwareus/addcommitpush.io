import { BlogHeading, BlogList, BlogListItem, Figure } from "@/components/custom"
import Link from "next/link"

export function SaasZeroToOneHindsightContent() {
  return (
    <>
      <Figure
        src="/posts/saas-zero-to-one-hindsight/cover-optimized.avif"
        alt="Thinking of my past startup experiences"
        width={1200}
        height={630}
        caption="Me reflecting on my mistakes"
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
          prose-li:text-foreground prose-li:my-2
          prose-blockquote:border-l-secondary prose-blockquote:text-muted-foreground"
      >
        <p>
          In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and
          Sales with the perception that the SaaS product was &quot;done&quot; and ready to take on the world. We just
          needed to add some more ML-enabled capabilities and off we go! We were wrong.. so so wrong.
        </p>

        <div className="my-8" />


        <p>
          About a year later I was recognized as a Co-Founder, and have continually thrown spaghetti [and my head]
          against the wall to see what sticks with customers. With a lot of detours, bad assumptions, hacky code, good
          code, talking to users, research, and sales we got recognized in the industry by being acquired a few months
          ago. Today, we are scaling our SaaS growth loop, building great products, and scaling the team, and I&apos;d
          like to share some lessons learned about building a SaaS company.
        </p>

        <p>I&apos;ll try to reason about:</p>

        <BlogList variant="unordered">
          <BlogListItem>Knowing that the unknowns are unknown</BlogListItem>
          <BlogListItem>Capability to deliver vs. delivering</BlogListItem>
          <BlogListItem>Measure, Talk, Build, Repeat</BlogListItem>
          <BlogListItem>Building with conviction</BlogListItem>
          <BlogListItem>Focusing was painful</BlogListItem>
        </BlogList>

        <BlogHeading level={2}>Knowing that the unknowns are unknown</BlogHeading>

        <p>
          As we started out we were naive to the challenge we tried to solve. We didn&apos;t do enough research on the
          space, the competitive landscape, substitutes, and the direction of the market. In some ways, that was fine.
          We started out doing a lot of things right for the wrong reasons, simply talking to potential customers and
          building products. Not because we knew that would be a good strategy, but rather because none of us had ever
          really worked at a large enterprise or in this market. It turned out that the culture to &quot;just build
          things&quot; and listening to customers was a good fit for building a deep-tech SaaS offering.
        </p>

        <p>
          <Figure
            src="/posts/saas-zero-to-one-hindsight/mw2-optimized.webp"
            alt="Just build it"
            width={600}
            height={400}
            caption={
              <>
                <em>
                  Meme stolen from this{" "}
                  <Link href="https://www.youtube.com/watch?v=IYLVhk7yaaw" target="_blank" rel="noopener noreferrer">
                    Y Combinator video
                  </Link>
                </em>
              </>
            }
            className="my-8"
          />
        </p>

        <p>
          In the first few months of our journey, we realized that a lot of the assumptions we continuously made were
          wrong. It was not that we made illogical assumptions, but rather that it is very hard to predict what
          customers will love. Rather than keep making bad predictions, we embraced that we need to accurately figure
          out the unknowns by talking to customers.
        </p>

        <p>Roughly we needed to know if an [idea, feature, pivot, etc.] was good by figuring out if:</p>

        <BlogList variant="unordered">
          <BlogListItem>Investors think it&apos;s a great idea (0.1%)</BlogListItem>
          <BlogListItem>Internal or expert conviction (0.9%)</BlogListItem>
          <BlogListItem>Research or competitors talks about this like it is important (4%)</BlogListItem>
          <BlogListItem>
            Customers are indicating pain, and this [idea, feature, pivot, etc.] will relieve it (10%)
          </BlogListItem>
          <BlogListItem>Customers are responding well to the pitch (15%)</BlogListItem>
          <BlogListItem>Customers are talking to us about this feature before we pitch (20%)</BlogListItem>
          <BlogListItem>Customers pay largely due to this feature (50%)</BlogListItem>
        </BlogList>

        <p>
          The percentage is indicating the weight of importance of each point of validation. This very approximate
          framework gave me some guidance on how to think about features and ideas in a way to always focuses on the
          customer. Also, nothing is validated until many different customers are <em>actually</em> paying for it.
        </p>

        <BlogHeading level={2}>Capability to deliver vs. delivering</BlogHeading>

        <p>
          In the boxing match of <strong>execution</strong> vs. <strong>process</strong>, I&apos;m deeply rooted in the
          execution corner. I believe that since we do not know what we don&apos;t know, it is not necessary to build
          processes around things that may as well be left in the dust. This doesn&apos;t mean that we shouldn&apos;t
          have sprint planning, demos, post mortems, etc. but rather that process usually takes a lot of time from the
          most productive individual contributors in your company. It is important not to overload these people with
          meetings and syncs which is a waste of time in most cases.
        </p>

        <p>
          Instead of implementing processes, hire people that thrive and feel passionate about solving problems for your
          customer. This does <em>absolutely</em> not only apply to your customer success-/sales-people but to
          developers and tech people as well! An established process for Quality Assurance (QA) should not be needed in
          your startup development team, since you have hired developers that focus on customer outcomes and rigorously
          write code until the customer&apos;s problem is solved. If you get customer feedback that your newly developed
          API endpoint times out in production, the developer did not have the diligence to actually assure that
          [she/he] solved the customer&apos;s problem when the issue was closed.
        </p>

        <p>
          Capability to deliver is not only about making time to deliver or hiring accountable people, but also creating
          the right environment for it.
        </p>

        <blockquote>
          <p>As a startup you are throwing spaghetti at lightning speed.</p>
        </blockquote>

        <p>
          Therefore, you should strive to create a development environment where it is safe to miss from time to time.
          At Debricked, we created logical layers in our architecture where we tried to keep some of those layers off
          the critical path. This meant that those parts of our service that were not in the critical path but rather
          had to cache logic in critical-path layers could tolerate higher change-failure rates, lower uptime, and
          therefore higher development speed.
        </p>

        <p>In this triangle, you can see what I believe are the tradeoffs of a startup.</p>

        <Figure
          src="/posts/saas-zero-to-one-hindsight/triang-optimized.png"
          alt="Triangle of Development for startups"
          width={600}
          height={400}
          className="my-8"
        />

        <p>
          If you&apos;ve ever tried{" "}
          <Link href="https://debricked.com/select/" target="_blank" rel="noopener noreferrer">
            Open Source Select
          </Link>
          , you should know that it is just a large cache.. where all the actual logic is run in a microservice that
          acts as a backend to the backend, enabling that microservice to have 20% downtime and no one would notice…
          That enables iteration on that service to be incredibly fast!
        </p>

        <p>
          So, my point is that delivering and the capability to deliver are tightly coupled, and corporate processes
          that are masked as capability may just slow you down. If you have the urge to remove a process, it is
          probably the right call to make.
        </p>

        <BlogHeading level={2}>Measure, Talk, Build, Repeat</BlogHeading>

        <p>
          In the beginning, we did not do this right. We built the product with conviction and listened to very few
          potential customers with low willingness to pay and very specific needs. Today, we have a healthier approach
          where we measure with{" "}
          <Link href="https://mixpanel.com/" target="_blank" rel="noopener noreferrer">
            Mixpanel
          </Link>
          , pipe data through{" "}
          <Link href="https://segment.com/" target="_blank" rel="noopener noreferrer">
            Segment
          </Link>
          , and store data in GCP BigQuery. These data platforms really enabled deeper customer knowledge, roadmap
          prioritization, and the ability to be data-driven, and became rooted in our culture, this was night and day in
          how we operate at the core.
        </p>

        <blockquote>
          <p>Beeing datadriven is a culture, and it&apos;s fun when people are on board!</p>
        </blockquote>

        <p>To make data a part of our culture, we implemented a few things:</p>

        <BlogList variant="unordered">
          <BlogListItem>
            Tracking (sending events to Segment) is part of the acceptance criteria for any new feature.
          </BlogListItem>
          <BlogListItem>
            We have a dedicated person whose only responsibility is customer analytics. The person is a developer who
            continuously improves the tracking data and adds tracking to old features. This is especially important to
            be able to communicate, the person will be working cross-departmentally to make everyone happy with the data
            quality.
          </BlogListItem>
          <BlogListItem>
            For every major &quot;event&quot; (Signup, specific feature usage, upgrade, churn, ..) we have a separate
            slack channel with a slack-bot, posting out EVERY event of that type. Ideally, this slack-bot also indicates
            if that was pleasant for the customer to use that feature or not.
          </BlogListItem>
          <BlogListItem>
            We created dashboards indicating the success of each feature, and pin those in the respective slack channel.
          </BlogListItem>
          <BlogListItem>
            We try to connect our company/team goals to things that are measurable in these tools. This is still hard as
            a B2B SaaS with just a few active users within a large company.
          </BlogListItem>
          <BlogListItem>
            Leaders in the company are to encourage employees with these data points… &quot;It seemed like the feature
            you developed is getting used, well done!&quot;
          </BlogListItem>
        </BlogList>

        <p>
          Dashboards are great, but it only surfaces the problems and doesn&apos;t tell you what the solutions are. To
          find solutions, one has to talk to customers! This is something that we are still struggling with, as
          it&apos;s hard to ask for (and get) time from someone that had a bad experience with your tool. What we try to
          do is to identify either our &quot;super users&quot; that continuously use our tool and seem to like it, or to
          talk to customers that used a specific feature we want to research more about. There are many other resources
          on how to talk to users, such as this{" "}
          <Link href="https://www.ycombinator.com/library/6g-how-to-talk-to-users" target="_blank" rel="noopener noreferrer">
            Y Combinator
          </Link>{" "}
          post. I&apos;ll update this blog post when I have more to give in this area! :)
        </p>

        <BlogHeading level={2}>Building with conviction</BlogHeading>

        <p>
          Building measure learning is great for incremental innovation. What if your innovation is not incremental?
          Maybe you are building something that is more binary, either it&apos;s there or it&apos;s not and it takes a
          significant amount of time to build. There may be some situations where you need to build with conviction, and
          we felt that a few times as well.
        </p>

        <p>
          To start with, when I look in hindsight at all our &quot;conviction plays&quot; there are multiple ways we
          could have made it way more incremental and data-driven. Just because you are building something innovative
          that <strong>needs to be large</strong> there is no need to not be data-driven. Also, chances are that if you
          try to break it down into increments in front of a whiteboard with some smart people, you can. Try to do that
          first…
        </p>

        <p>
          If that&apos;s not possible, you should talk to potential customers. Who is feeling the pain you would like to
          solve? Is it important to them? Is it big, small, frequent or infrequent? What are the substitutes? When we
          built Open Source Select, there was a fair bit of conviction involved that this was the right way ahead. Our
          approach to reducing the uncertainty and more closely connecting our ideas to actual customer problems was to
          start talking to a lot of people. Mainly, we focused on developers and Open Source Program Office (OSPO) leads
          and tried to discover their &quot;war stories&quot; on the cost of choosing the wrong open-source project. It
          became clear that these two users had vastly different agendas, needs, and priorities, but both wanted to
          avoid the pitfalls of technical debt and security issues of unmaintained open source. These realizations
          became great input to our product teams! My point is, that building with conviction can usually be replaced
          with user research and incremental innovation.
        </p>

        <p>
          If time-to-market is not critical with a particular conviction play (start to develop it within ~6 months), we
          leveraged master thesis students. This has been very successful for us, as we got to research a lot of
          different potential ways ahead, without committing critical people to it. Some of these projects became
          nothing, and some are core to our product today. It was also a great recruitment funnel, as you had months to
          convince them to work with you (and months to see if they are up-to-par).
        </p>

        <BlogHeading level={2}>Focusing was painful</BlogHeading>

        <p>
          When we started out in 2018/19, we thought we could do everything. Time and time again this put us in a
          situation where we felt like we were pushing the Great Wall of China 0.01 centimeters a day. With the
          hindsight hat on, we should have focused more on niche segments and feature sets in our tool. We pursued too
          many <strong>dimensions</strong> in our product. The dimensions we tried to develop for simultaneously were:
          Platform & Build systems [GitHub, GitLab, Bitbucket, Azure DevOps, Jenkins, Circleci]. This was easy to scale
          for some features but time-consuming for others.
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            Language [JavaScript, Java, Kotlin, Go, C#, PHP, Python, Objective-C, Swift, Rust, Ruby, Linux]. A very
            significant amount of work for each language.
          </BlogListItem>
          <BlogListItem>
            Use cases [Security, License & Compliance, Quality of OSS, Selection of OSS]. MAJOR investments were needed
            in each one to make it good or great.
          </BlogListItem>
          <BlogListItem>
            Feature sets [remediation, prevention, deep analysis, guidance, enterprise user management, and much more…]
          </BlogListItem>
          <BlogListItem>Customer segments [SMB, Enterprise, Self-serve/PLG]</BlogListItem>
        </BlogList>

        <p>
          We really only learned to focus as a company after the acquisition, choosing only one or very few parts in
          each dimension. If I got to re-live the beginning of our endeavor, I would have pruned these dimensions A LOT
          from the start.
        </p>

        <p>
          Today, we leverage OKR&apos;s{" "}
          <Link href="https://en.wikipedia.org/wiki/OKR" target="_blank" rel="noopener noreferrer">
            Objectives & Key Results
          </Link>
          . It helps us propagate company goals throughout the organization and align everyone to the same underlying
          objectives. Clear focus and objectives also helped to align and lead the company. It became clear to me when I
          went on vacation this summer. I did not need to keep a perfect backlog prioritized, as my team members just
          evaluated each task themselves towards our goal and picked what I would have picked 9 times out of 10.
        </p>

        <BlogHeading level={2}>I feel like Emil 2.0 …</BlogHeading>

        <p>
          … as I&apos;m finishing up this blog post. If you got this far in my post, I&apos;m inclined to believe that
          you want to start your own company someday… do it! To me, it was the most thrilling experience in my
          professional life so far and I truly feel like I just leveled up. It also feels like I&apos;m level 2 out of
          100, I wonder what the next thing could be ;)
        </p>
      </div>
    </>
  )
}
