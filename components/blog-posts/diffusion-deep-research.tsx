'use client';

import {
  BlogHeading,
  BlogList,
  BlogListItem,
  BlogLink,
  Figure,
  Callout,
  Terminal,
  Prompt,
} from '@/components/custom';
import {
  DiffusionOverview,
  DraftDenoising,
  ParallelAgents,
  TwoStageGap,
  RACEMetrics,
  DiffusionLoopStep,
} from '@/components/animations/diffusion';

export function DiffusionDeepResearchContent() {
  return (
    <div
      className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-accent prose-blockquote:border-l-secondary prose-blockquote:text-muted-foreground"
    >
      <Figure
        src="/posts/diffusion-deep-research/cover-optimized.webp"
        alt="Diffusion deep research pipeline"
        caption="Self-balancing test-time diffusion for research agents"
        priority
        className="mb-12"
      />

      <div className="space-y-6">
        <p>
          Remember back in school when you had one of those infamous and dreaded group projects (I
          kinda liked them)...
        </p>
        <p>
          At least a few times you probably tried the "parallel" way of working, optimizing for a bit
          less collaboration and each participant owning one segment of the report. Off you go! Each
          person for themselves writing extensive backgrounds, history, theory, or whatever segments
          you decided on. Then you meet up 3 hours before the deadline to "glue the report"
          together—how did that turn out?
        </p>
        <div>
          <p className="mb-3">The result was probably:</p>
          <BlogList variant="unordered">
            <BlogListItem>Repetitive</BlogListItem>
            <BlogListItem>Inconsistent</BlogListItem>
            <BlogListItem>Different tone of voice per segment</BlogListItem>
            <BlogListItem>Vastly different quality per segment</BlogListItem>
            <BlogListItem>Not the grade you hoped for</BlogListItem>
          </BlogList>
        </div>
        <p>
          It turns out, when we construct our AI research agents like this (plan -&gt; parallel
          research -&gt; glue research into report), we get the same problem! When no context of the
          "evolving report" is shared across sub-agents, we get a fragmented ball of mud.
        </p>
        <p>
          These sequential and isolated group projects/research agents have their perks, like high
          level of autonomy and parallelism... but there are probably better ways to do it.
        </p>

        <BlogHeading level={2}>Diffusion Deep Research</BlogHeading>
        <p>
          Think of diffusion agent models like brainstorming, but instead of everyone writing their
          own part in isolation and building a Frankenstein report, the research spreads and overlaps
          as it evolves within the team. Ideas for each segment are not isolated, as not one person
          owns each segment.
        </p>
        <p>
          The team starts off by writing a draft, only based on their internal knowledge. Typically
          in bullet point format with clear notes about missing references, knowledge gaps, outdated
          information, and uncertainty.
        </p>
        <p>
          The students prioritize these knowledge gaps together and research different perspectives
          of those gaps (in parallel isolation) and add them back to the report in an iterative
          manner as a group. Gradually the draft evolves into an iteratively better report, filling
          gaps and enriching knowledge. The draft grows to become the final report. In each writing
          step, the students have a clear process for transforming rich knowledge into a concise
          report that fits into the whole story they are trying to tell.
        </p>
        <p>
          To me, this makes a lot more sense! I'll explore the implementation details of text
          diffusion in this blog post. Enjoy!
        </p>
      </div>

      <BlogHeading level={2}>Why diffusion for research?</BlogHeading>

      <BlogHeading level={3}>The problem with single-pass research</BlogHeading>
      <p>
        Traditional AI research agents follow a linear paradigm: <code>Query → Search → Synthesize → Report</code>.
        This suffers from fundamental limitations:
      </p>
      <BlogList variant="ordered">
        <BlogListItem>
          <strong>Information Loss:</strong> Important context discovered late cannot influence earlier decisions.
        </BlogListItem>
        <BlogListItem>
          <strong>No Self-Correction:</strong> Errors or gaps in early research propagate to the final output.
        </BlogListItem>
        <BlogListItem>
          <strong>Static Search Strategy:</strong> The search strategy is fixed at the start and cannot adapt.
        </BlogListItem>
        <BlogListItem>
          <strong>Coherence Degradation:</strong> Long reports lose coherence when sections are generated independently.
        </BlogListItem>
      </BlogList>

      <BlogHeading level={3}>The diffusion paradigm</BlogHeading>
      <p>
        Diffusion models, originally developed for image generation, provide an elegant solution. Instead
        of generating content in one pass, they start with a <strong>noisy initial state</strong> (random
        noise for images, rough draft for research) and <strong>iteratively refine</strong> through multiple
        denoising steps, using <strong>guidance signals</strong> to steer the refinement.
      </p>

      <blockquote className="border-l-4 border-secondary pl-4 italic my-6">
        &ldquo;The iterative nature of diffusion models naturally mirrors how humans actually conduct
        research—cycles of searching, reasoning, and revision.&rdquo;
        <br />
        <span className="text-sm not-italic">— Google Research, Deep Researcher with Test-Time Diffusion, 2025</span>
      </blockquote>

      <DiffusionOverview className="my-10" />

      <BlogHeading level={2}>Theoretical foundations</BlogHeading>

      <BlogHeading level={3}>Classical diffusion models</BlogHeading>
      <p>
        In classical diffusion models (DDPM, Stable Diffusion), the process consists of two phases:
      </p>
      <p>
        <strong>Forward Diffusion:</strong> Gradually add noise to data: <code>x₀ → x₁ → x₂ → ... → xₜ (pure noise)</code>
      </p>
      <p>
        <strong>Reverse Diffusion:</strong> Learn to denoise step by step: <code>xₜ → xₜ₋₁ → ... → x₁ → x₀ (clean data)</code>
      </p>

      <BlogHeading level={3}>Adaptation to research</BlogHeading>
      <p>
        For research report generation, we reinterpret this process:
      </p>

      <div className="overflow-x-auto my-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-4 font-semibold">Classical Diffusion</th>
              <th className="text-left py-2 px-4 font-semibold">Research Diffusion</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4">Random noise (xₜ)</td>
              <td className="py-2 px-4">Initial draft from model knowledge</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4">Denoising step</td>
              <td className="py-2 px-4">Research iteration + draft refinement</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4">Guidance signal</td>
              <td className="py-2 px-4">Retrieved information from web search</td>
            </tr>
            <tr>
              <td className="py-2 px-4">Clean output (x₀)</td>
              <td className="py-2 px-4">Comprehensive, accurate research report</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        The key insight is that the <strong>initial draft</strong> generated purely from the LLM&apos;s
        training data represents the &ldquo;noisy&rdquo; starting state. Each iteration of identifying gaps,
        searching for information, and incorporating findings acts as a <strong>denoising step</strong> that
        brings the report closer to ground truth.
      </p>

      <BlogHeading level={3}>Mathematical formulation</BlogHeading>
      <p>Let:</p>
      <BlogList variant="unordered">
        <BlogListItem><code>D₀</code> = Initial draft (from LLM training data only)</BlogListItem>
        <BlogListItem><code>Dₜ</code> = Draft at iteration t</BlogListItem>
        <BlogListItem><code>R(Dₜ)</code> = Research function that identifies gaps and retrieves information</BlogListItem>
        <BlogListItem><code>U(Dₜ, R(Dₜ))</code> = Update function that incorporates research into draft</BlogListItem>
      </BlogList>

      <p>The diffusion process becomes:</p>
      <Terminal className="my-4">
{`D₁ = U(D₀, R(D₀))
D₂ = U(D₁, R(D₁))
...
Dₙ = U(Dₙ₋₁, R(Dₙ₋₁))`}
      </Terminal>

      <p>The process terminates when:</p>
      <BlogList variant="unordered">
        <BlogListItem><code>R(Dₜ)</code> returns no new information (information gap closed)</BlogListItem>
        <BlogListItem>Maximum iterations reached (hard limit: 15)</BlogListItem>
        <BlogListItem>Supervisor determines research is comprehensive</BlogListItem>
      </BlogList>

      <DraftDenoising className="my-10" />

      <BlogHeading level={2}>Core architecture: four phases</BlogHeading>
      <p>
        The implementation consists of four primary phases, orchestrated through a state machine:
      </p>

      <BlogHeading level={3}>Phase 1: Research brief generation</BlogHeading>
      <p>
        Transform the user query into a detailed research brief with sources, constraints, and scope.
        This ensures all downstream research is grounded in explicit requirements.
      </p>

      <BlogHeading level={3}>Phase 2: Initial draft generation</BlogHeading>
      <p>
        Generate a draft from the LLM&apos;s <strong>internal knowledge only</strong>—no external
        information retrieval yet. This is the &ldquo;noisy&rdquo; initial state that provides structure
        to guide subsequent research. It may contain outdated or incomplete information, and that&apos;s
        intentional.
      </p>

      <BlogHeading level={3}>Phase 3: Diffusion loop (supervisor subgraph)</BlogHeading>
      <p>
        The core innovation. Each iteration follows four steps:
      </p>
      <BlogList variant="ordered">
        <BlogListItem>Generate research questions to address <strong>gaps</strong> in the draft</BlogListItem>
        <BlogListItem><code>conduct_research</code>: Retrieve external info for &ldquo;denoising&rdquo;</BlogListItem>
        <BlogListItem><code>refine_draft</code>: Remove &ldquo;noise&rdquo; (imprecision, incompleteness) from draft</BlogListItem>
        <BlogListItem>Assess: Are findings comprehensive? (NOT draft appearance!)</BlogListItem>
      </BlogList>

      <BlogHeading level={3}>Phase 4: Final report generation</BlogHeading>
      <p>
        Apply quality optimization with Insightfulness + Helpfulness rules. Deduplicate findings by URL,
        add granular breakdowns, detailed mapping tables, nuanced discussion, and proper citations.
      </p>

      <ParallelAgents className="my-10" />

      <BlogHeading level={2}>The diffusion algorithm</BlogHeading>
      <p>
        The core innovation is the <strong>Self-Balancing Test-Time Diffusion</strong> algorithm,
        encoded directly in the supervisor&apos;s system prompt. Here is the exact algorithm from
        the Go implementation:
      </p>

      <Prompt
        label="Diffusion Algorithm"
        className="my-6"
        value={`<Diffusion Algorithm>
1. generate the next research questions to address gaps in the draft report
2. **conduct_research**: retrieve external information to provide concrete delta for denoising
3. **refine_draft**: remove "noise" (imprecision, incompleteness) from the draft report
4. **research_complete**: complete research only based on conduct_research tool's findings'
   completeness. it should not be based on the draft report. even if the draft report looks
   complete, you should continue doing the research until all the research findings are
   collected. You know the research findings are complete by running conduct_research tool
   to generate diverse research questions to see if you cannot find any new findings.
</Diffusion Algorithm>`}
      />

      <Callout variant="warning">
        <strong>Critical distinction:</strong> Research completion is determined by findings completeness,
        not by how polished the draft looks. Even if the draft appears complete, continue researching
        until diverse queries stop yielding new facts.
      </Callout>

      <DiffusionLoopStep className="my-10" />

      <BlogHeading level={2}>Implementation: the real prompts</BlogHeading>
      <p>
        Below are the actual prompts from the Go implementation. Understanding these is crucial for
        implementing your own diffusion research system.
      </p>

      <BlogHeading level={3}>Lead researcher (supervisor) prompt</BlogHeading>
      <p>
        This prompt orchestrates the entire diffusion loop. Note the explicit algorithm, hard limits,
        and scaling rules:
      </p>

      <Prompt
        label="Lead Researcher Prompt"
        className="my-4"
        value={`You are a research supervisor. Your job is to conduct research by calling the
"conduct_research" tool and refine the draft report by calling "refine_draft"
tool based on your new research findings.

<Diffusion Algorithm>
1. generate the next research questions to address gaps in the draft report
2. **conduct_research**: retrieve external information to provide concrete delta for denoising
3. **refine_draft**: remove "noise" (imprecision, incompleteness) from the draft report
4. **research_complete**: complete research only based on conduct_research tool's findings'
   completeness. it should not be based on the draft report.
</Diffusion Algorithm>

<Hard Limits>
- **Bias towards single agent** - Use single agent unless clear parallelization opportunity
- **Stop when you can answer confidently** - Don't keep delegating for perfection
- **Limit tool calls** - Always stop after {maxIterations} tool calls
</Hard Limits>

<Scaling Rules>
**Simple fact-finding**: Use 1 sub-agent
**Comparisons**: Use sub-agent per element (max 3 parallel)
**Data Analysis**: Delegate with clear file path AND analysis objective

**Important**: When calling conduct_research, provide complete standalone instructions -
sub-agents can't see other agents' work
</Scaling Rules>`}
      />

      <BlogHeading level={3}>Sub-researcher prompt</BlogHeading>
      <p>
        Each sub-agent operates with isolated context and strict iteration limits:
      </p>

      <Prompt
        label="Sub-Researcher Prompt"
        className="my-4"
        value={`You are a research assistant conducting research on the user's input topic.

<Hard Limits>
**Tool Call Budgets** (Prevent excessive searching):
- **Simple queries**: Use 2-3 search tool calls maximum
- **Complex queries**: Use up to 5 search tool calls maximum
- **Always stop**: After 5 search tool calls if you cannot find the right sources

**Stop Immediately When**:
- You can answer the user's question comprehensively
- You have 3+ relevant examples/sources for the question
- Your last 2 searches returned similar information
</Hard Limits>

<Show Your Thinking>
After each search tool call, use think to analyze the results:
- What key information did I find?
- What's missing?
- Do I have enough to answer the question comprehensively?
- Should I search more or provide my answer?
</Show Your Thinking>`}
      />

      <BlogHeading level={3}>Research compression prompt</BlogHeading>
      <p>
        Before returning to the supervisor, each sub-agent&apos;s findings are compressed while
        preserving ALL information verbatim:
      </p>

      <Prompt
        label="Research Compression Prompt"
        className="my-4"
        value={`You are a research assistant that has conducted research on a topic. Your job is now
to clean up the findings, but preserve all of the relevant statements and information.

<Tool Call Filtering>
**IMPORTANT**: Focus only on substantive research content:
- **Include**: All search results and findings from web searches
- **Exclude**: think tool calls and responses - these are internal agent reflections
- **Focus on**: Actual information gathered from external sources
</Tool Call Filtering>

<Guidelines>
1. Output findings should be fully comprehensive and include ALL information verbatim
2. Include inline citations for each source
3. Include a "Sources" section at the end with all sources
4. Make sure to include ALL sources - a later LLM will merge this with others

Critical: Any information even remotely relevant must be preserved verbatim
(don't rewrite, summarize, or paraphrase it).
</Guidelines>`}
      />

      <BlogHeading level={3}>Final report prompt (with quality rules)</BlogHeading>
      <p>
        The final synthesis applies both Insightfulness and Helpfulness rules:
      </p>

      <Prompt
        label="Final Report Prompt"
        className="my-4"
        value={`<Insightfulness Rules>
- Granular breakdown - Does the response have granular breakdown of topics
  and their specific causes and specific impacts?
- Detailed mapping table - Does the response have a detailed table mapping
  causes and effects?
- Nuanced discussion - Does the response have detailed exploration and
  explicit discussion?
</Insightfulness Rules>

<Helpfulness Rules>
- Satisfying user intent - Does the response directly address the user's request?
- Ease of understanding - Is the response fluent, coherent, and logically structured?
- Accuracy - Are the facts, reasoning, and explanations correct?
- Appropriate language - Is the tone suitable and professional?
</Helpfulness Rules>

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...)
- Citations are extremely important - users rely on these
</Citation Rules>`}
      />

      <BlogHeading level={2}>Self-balancing: two-stage gap closing</BlogHeading>
      <p>
        The algorithm explicitly separates <strong>information gap closing</strong> from{' '}
        <strong>generation gap closing</strong>:
      </p>

      <TwoStageGap className="my-10" />

      <BlogHeading level={3}>Why separate the stages?</BlogHeading>

      <blockquote className="border-l-4 border-secondary pl-4 italic my-6">
        &ldquo;There is a trade-off between the two gaps. We cannot optimize the generation gap
        too early when the system is still optimizing the information gap because the generation
        gap tends to bring more verbose and stylistic content that can distract from finding
        missing information.&rdquo;
        <br />
        <span className="text-sm not-italic">— Paichun Lin, ThinkDepth.ai</span>
      </blockquote>

      <p><strong>Stage 1 characteristics:</strong></p>
      <BlogList variant="unordered">
        <BlogListItem>Focus on <strong>what</strong> information exists, not <strong>how</strong> to present it</BlogListItem>
        <BlogListItem>Draft updates are functional, not polished</BlogListItem>
        <BlogListItem>Prioritizes breadth of coverage</BlogListItem>
        <BlogListItem>Uses global-context OR section-specific queries based on gap analysis</BlogListItem>
      </BlogList>

      <p><strong>Stage 2 characteristics:</strong></p>
      <BlogList variant="unordered">
        <BlogListItem>All information is available</BlogListItem>
        <BlogListItem>Focus on presentation, coherence, and user satisfaction</BlogListItem>
        <BlogListItem>Applies full Insightfulness + Helpfulness rules</BlogListItem>
        <BlogListItem>Generates final deliverable with proper citations</BlogListItem>
      </BlogList>

      <BlogHeading level={2}>Context engineering considerations</BlogHeading>
      <p>
        Long-horizon research tasks face several context challenges. The diffusion approach
        addresses each systematically:
      </p>

      <div className="overflow-x-auto my-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-4 font-semibold">Problem</th>
              <th className="text-left py-2 px-4 font-semibold">Description</th>
              <th className="text-left py-2 px-4 font-semibold">Diffusion Solution</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4 font-medium">Context Poisoning</td>
              <td className="py-2 px-4">Hallucinations enter context</td>
              <td className="py-2 px-4">Draft serves as verified state</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4 font-medium">Context Distraction</td>
              <td className="py-2 px-4">Too much context overwhelms focus</td>
              <td className="py-2 px-4">Parallel sub-agents with isolated contexts</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-4 font-medium">Context Confusion</td>
              <td className="py-2 px-4">Superfluous context influences output</td>
              <td className="py-2 px-4">Structured finding format with compression</td>
            </tr>
            <tr>
              <td className="py-2 px-4 font-medium">Context Clash</td>
              <td className="py-2 px-4">Parts of context disagree</td>
              <td className="py-2 px-4">Supervisor resolves conflicts during refinement</td>
            </tr>
          </tbody>
        </table>
      </div>

      <BlogHeading level={3}>Draft as context anchor</BlogHeading>
      <p>
        The draft serves as a <strong>persistent, verified context</strong> that:
      </p>
      <BlogList variant="unordered">
        <BlogListItem><strong>Evolves incrementally:</strong> Each <code>refine_draft</code> call is validated</BlogListItem>
        <BlogListItem><strong>Structures information:</strong> Prevents disorganized accumulation</BlogListItem>
        <BlogListItem><strong>Guides research:</strong> Makes gaps explicit</BlogListItem>
        <BlogListItem><strong>Maintains coherence:</strong> Narrative thread across iterations</BlogListItem>
      </BlogList>

      <Terminal className="my-4">
{`Traditional RAG:              Diffusion Approach:

Query → Search → Response     Query → Brief → Draft → [Research → Refine] × N → Report

Context grows unboundedly     Draft stays ~constant size
No structure                  Structured by sections
Can contradict itself         Conflicts resolved each iteration`}
      </Terminal>

      <BlogHeading level={3}>Multi-agent context isolation</BlogHeading>
      <p>
        Sub-researchers operate with <strong>isolated contexts</strong>—they cannot see each other&apos;s
        work. This prevents topic A&apos;s findings from biasing topic B&apos;s research, keeps context
        from growing unboundedly during parallel work, and avoids confusion from interleaved search results.
      </p>

      <BlogHeading level={2}>Benchmark performance (RACE + FACT)</BlogHeading>
      <p>
        <BlogLink href="https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard">
          DeepResearch Bench
        </BlogLink>{' '}
        is the comprehensive benchmark for evaluating Deep Research Agents. It consists of{' '}
        <strong>100 PhD-level research tasks</strong> designed by domain experts across Science &amp;
        Technology, Finance &amp; Business, Software, and other fields.
      </p>

      <BlogHeading level={3}>RACE framework (report quality)</BlogHeading>
      <p>
        RACE evaluates report generation quality through four dimensions:
      </p>
      <BlogList variant="unordered">
        <BlogListItem><strong>Comprehensiveness:</strong> Coverage breadth and depth (measures information gap closing)</BlogListItem>
        <BlogListItem><strong>Insight / Depth:</strong> Quality, originality, logic, and value of analysis</BlogListItem>
        <BlogListItem><strong>Instruction Following:</strong> Adherence to task requirements and constraints</BlogListItem>
        <BlogListItem><strong>Readability:</strong> Clarity of structure, fluency, ease of understanding (measures generation gap closing)</BlogListItem>
      </BlogList>

      <BlogHeading level={3}>FACT framework (citation quality)</BlogHeading>
      <p>
        FACT evaluates information retrieval and grounding capabilities:
      </p>
      <BlogList variant="ordered">
        <BlogListItem>Automatically extract statement-URL pairs from the report</BlogListItem>
        <BlogListItem>Deduplicate redundant pairs</BlogListItem>
        <BlogListItem>Web scrape + LLM judgment to verify support</BlogListItem>
        <BlogListItem>Calculate Citation Accuracy (% correctly supported) and Effective Citations (avg verified per task)</BlogListItem>
      </BlogList>

      <RACEMetrics className="my-10" />

      <BlogHeading level={3}>Why diffusion outperforms</BlogHeading>
      <BlogList variant="ordered">
        <BlogListItem>
          <strong>Iterative refinement catches gaps → Higher Comprehensiveness.</strong> Each iteration
          identifies and fills missing information. Traditional single-pass cannot self-correct.
        </BlogListItem>
        <BlogListItem>
          <strong>Parallel execution is efficient → Better Coverage.</strong> Up to 3 sub-researchers
          gather diverse perspectives simultaneously with isolated contexts.
        </BlogListItem>
        <BlogListItem>
          <strong>Explicit completion criteria → Validated Comprehensiveness.</strong> Research ends
          based on findings comprehensiveness, not draft appearance.
        </BlogListItem>
        <BlogListItem>
          <strong>Self-balancing adaptivity → Right-Sized Research.</strong> Simple topics: 2-3
          iterations. Complex topics: 10+ iterations as needed.
        </BlogListItem>
        <BlogListItem>
          <strong>Draft as context anchor → Higher Readability.</strong> Draft serves as persistent
          context across iterations, reducing the &ldquo;lost in the middle&rdquo; problem.
        </BlogListItem>
        <BlogListItem>
          <strong>Quality rules in final generation → Higher Insight.</strong> Insightfulness Rules
          (granular breakdown, detailed tables, nuanced discussion) applied systematically.
        </BlogListItem>
      </BlogList>

      <BlogHeading level={2}>Configuration reference</BlogHeading>

      <Terminal className="my-4">
{`// Supervisor Configuration
maxResearcherIterations := 15  // Total supervisor tool calls
maxConcurrentResearchers := 3  // Parallel sub-agents

// Sub-Researcher Configuration
// Simple queries: 2-3 search calls max
// Complex queries: up to 5 search calls max
// Always stop after 5 if can't find sources

// Search Configuration
maxResultsPerQuery := 3
includeRawContent := true  // For summarization`}
      </Terminal>

      <BlogHeading level={2}>Practical takeaways</BlogHeading>
      <BlogList variant="ordered">
        <BlogListItem>
          <strong>Start with a draft.</strong> It reveals gaps faster than a blank page and provides
          structure for subsequent research.
        </BlogListItem>
        <BlogListItem>
          <strong>Deduplicate by URL before synthesis.</strong> Keeps signal high and prevents the same
          source from being cited multiple times with different wordings.
        </BlogListItem>
        <BlogListItem>
          <strong>Completion is about evidence coverage, not aesthetics.</strong> Run diverse queries
          and only stop when they yield no new facts.
        </BlogListItem>
        <BlogListItem>
          <strong>Cap iterations and concurrency.</strong> 15 loops max, 3 agents max. Prevents thrash
          and keeps costs predictable.
        </BlogListItem>
        <BlogListItem>
          <strong>Separate information gap from generation gap.</strong> Don&apos;t polish until the
          facts are locked—otherwise you&apos;re polishing hallucinations.
        </BlogListItem>
        <BlogListItem>
          <strong>Isolate sub-agent contexts.</strong> Each sub-researcher should have complete,
          standalone instructions. They can&apos;t see other agents&apos; work.
        </BlogListItem>
        <BlogListItem>
          <strong>Compress findings, preserve everything.</strong> When returning to the supervisor,
          remove only obvious duplicates—never summarize or paraphrase.
        </BlogListItem>
      </BlogList>

      <BlogHeading level={2}>References and further reading</BlogHeading>
      <BlogList variant="unordered">
        <BlogListItem>
          <BlogLink href="https://research.google/blog/deep-researcher-with-test-time-diffusion/">
            Google Research: Deep Researcher with Test-Time Diffusion (2025)
          </BlogLink>
        </BlogListItem>
        <BlogListItem>
          <BlogLink href="https://paichunlin.substack.com/p/self-balancing-agentic-ai-test-time">
            Paichun Lin: Self-Balancing Agentic AI: Test-Time Diffusion and Context Engineering Re-imagined
          </BlogLink>
        </BlogListItem>
        <BlogListItem>
          <BlogLink href="https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard">
            DeepResearch Bench Leaderboard
          </BlogLink>
        </BlogListItem>
        <BlogListItem>
          <BlogLink href="https://deepresearch-bench.github.io/">
            DeepResearch Bench Paper and Documentation
          </BlogLink>
        </BlogListItem>
        <BlogListItem>
          <BlogLink href="https://github.com/thinkdepthai/Deep_Research">
            ThinkDepth.ai Open Source Reference Implementation (Python)
          </BlogLink>
        </BlogListItem>
        <BlogListItem>
          <BlogLink href="http://www.incompleteideas.net/IncIdeas/BitterLesson.html">
            Richard Sutton: The Bitter Lesson (2019)
          </BlogLink>
        </BlogListItem>
      </BlogList>

      <Callout variant="tip">
        <strong>Bottom line:</strong> Treat research like diffusion—iterate, denoise with citations,
        and stop only when new searches stop yielding new facts. That discipline is what moved the
        needle on DeepResearch Bench, and it translates directly to shipping credible research-backed
        features.
      </Callout>
    </div>
  );
}
