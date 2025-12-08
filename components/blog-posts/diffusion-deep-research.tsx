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
import { Highlight, themes } from 'prism-react-renderer';

function GoCode({ code }: { code: string }) {
  return (
    <Highlight theme={themes.vsDark} code={code.trim()} language="go">
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} rounded-lg border border-border/40 bg-muted/40 p-4 overflow-x-auto font-normal`}
          style={{ ...style, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

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
          At least a few times you probably tried the &ldquo;parallel&rdquo; way of working, optimizing for a bit
          less collaboration and each participant owning one segment of the report. Off you go! Each
          person for themselves writing extensive backgrounds, history, theory, or whatever segments
          you decided on. Then you meet up 3 hours before the deadline to &ldquo;glue the report&rdquo;
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
          &ldquo;evolving report&rdquo; is shared across sub-agents, we get a fragmented ball of mud.
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
          To me, this makes a lot more sense! I&apos;ll explore the implementation details of text
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

      <p className="text-sm text-muted-foreground">
        The full diffusion algorithm prompt is available as a collapsible block in the code walkthrough
        below.
      </p>

      <Callout variant="warning">
        <strong>Critical distinction:</strong> Research completion is determined by findings completeness,
        not by how polished the draft looks. Even if the draft appears complete, continue researching
        until diverse queries stop yielding new facts.
      </Callout>

      <DiffusionLoopStep className="my-10" />

      <BlogHeading level={2}>How the diffusion loop actually runs (real code)</BlogHeading>
      <p>
        Let&apos;s walk through the <strong>complete implementation</strong> step by step. The diffusion
        algorithm has four distinct phases, and the code maps directly to these phases. Understanding
        this code is the key to implementing your own diffusion research system.
      </p>

      <BlogHeading level={3}>Phase 1 &amp; 2: Brief and initial draft generation</BlogHeading>
      <p>
        The entry point is <code>AgentLoop.Research</code>. This function orchestrates all four phases
        of the diffusion algorithm. The first two phases are straightforward LLM calls:
      </p>
      <GoCode
        code={`
// ============================================================================
// go-research/internal/architectures/think_deep/loop.go
// ============================================================================
// AgentLoop.Research is the main entry point for the diffusion algorithm.
// It orchestrates all four phases: brief → draft → diffusion → final report.

func (o *AgentLoop) Research(ctx context.Context, query string) (*LoopResult, error) {
    startTime := time.Now()

    // ========================================================================
    // PHASE 1: BRIEF GENERATION
    // ========================================================================
    // Transform the raw user query into a structured research brief.
    // The brief defines:
    //   - The core research question
    //   - Key sub-questions to explore
    //   - Expected deliverables and scope
    //   - Success criteria for the research
    //
    // This is a single LLM call using TransformToResearchBriefPrompt().
    // The brief serves as the "north star" for all subsequent research.

    researchBrief, _, _ := o.generateResearchBrief(ctx, query)

    // ========================================================================
    // PHASE 2: INITIAL DRAFT GENERATION (the "noisy" starting state)
    // ========================================================================
    // Generate the first draft using ONLY the LLM's training data.
    // This is the "noisy" initial state in diffusion terminology.
    //
    // The draft is intentionally imperfect - it contains:
    //   - Outdated information (training data cutoff)
    //   - Gaps marked with "[NEEDS RESEARCH]" placeholders
    //   - Uncertain claims that need verification
    //   - Incomplete sections that need expansion
    //
    // This "noise" will be "denoised" through iterative research.

    initialDraft, _, _ := o.generateInitialDraft(ctx, researchBrief)

    // ... continues to Phase 3 and 4 below
}
        `}
      />

      <BlogHeading level={3}>Phase 3: The diffusion loop (where the magic happens)</BlogHeading>
      <p>
        This is the heart of the algorithm. The supervisor runs an iterative loop that:
      </p>
      <BlogList variant="ordered">
        <BlogListItem>Analyzes gaps in the current draft</BlogListItem>
        <BlogListItem>Delegates research tasks to sub-agents (in parallel)</BlogListItem>
        <BlogListItem>Incorporates findings back into the draft</BlogListItem>
        <BlogListItem>Repeats until research is complete (not when draft looks good!)</BlogListItem>
      </BlogList>
      <GoCode
        code={`
// ============================================================================
// PHASE 3: THE DIFFUSION LOOP
// ============================================================================
// This is where iterative "denoising" happens. The supervisor coordinates
// multiple sub-researchers to fill gaps in the draft.
//
// Key insight: The loop continues until RESEARCH FINDINGS are complete,
// NOT until the draft looks polished. This prevents premature termination.

func (o *AgentLoop) Research(ctx context.Context, query string) (*LoopResult, error) {
    // ... Phase 1 & 2 above ...

    // ========================================================================
    // PHASE 3: SUPERVISOR COORDINATION (DIFFUSION LOOP)
    // ========================================================================
    // The supervisor.Coordinate() function runs the actual diffusion loop.
    // It takes:
    //   - researchBrief: the research objectives
    //   - initialDraft: the "noisy" starting state
    //   - o.executeSubResearch: a callback that spawns sub-researchers
    //
    // The callback pattern allows the supervisor to delegate research
    // without knowing the implementation details of sub-researchers.

    supervisorResult, _ := o.supervisor.Coordinate(
        ctx,
        researchBrief,
        initialDraft,
        o.executeSubResearch,  // <-- This callback spawns parallel sub-agents
    )

    // supervisorResult now contains:
    //   - Notes: compressed research findings from all sub-researchers
    //   - DraftReport: the iteratively refined draft
    //   - SubInsights: structured insights with source URLs
    //   - IterationsUsed: how many diffusion iterations ran
    //   - Cost: total token usage across all agents

    // ... continues to Phase 4 below
}
        `}
      />

      <details className="my-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Show prompt: Diffusion algorithm (supervisor loop)
        </summary>
        <div className="mt-3">
          <Prompt
            label="Diffusion Algorithm Prompt"
            className="my-0"
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
        </div>
      </details>

      <BlogHeading level={3}>Inside the supervisor: the actual diffusion iteration</BlogHeading>
      <p>
        Now let&apos;s look inside <code>SupervisorAgent.Coordinate</code> to see the actual loop.
        This is where tool calls are parsed, parallelism is handled, and the draft evolves:
      </p>
      <GoCode
        code={`
// ============================================================================
// go-research/internal/agents/supervisor.go
// ============================================================================
// SupervisorAgent.Coordinate runs the diffusion loop. Each iteration:
//   1. Builds context (system prompt + current draft + accumulated notes)
//   2. Asks the LLM what to do next (returns tool calls)
//   3. Executes tool calls (research in parallel, refinement sequentially)
//   4. Checks if research is complete
//   5. If not complete, loop back to step 1

func (s *SupervisorAgent) Coordinate(
    ctx context.Context,
    researchBrief string,
    initialDraft string,
    subResearcher SubResearcherCallback,  // Callback to spawn sub-agents
) (*SupervisorResult, error) {

    // Initialize state - this tracks the evolving draft and accumulated notes
    state := runtime.NewSupervisorState(researchBrief)
    state.UpdateDraft(initialDraft)

    // Build the system prompt once (includes the diffusion algorithm instructions)
    date := time.Now().Format("2006-01-02")
    systemPrompt := runtime.LeadResearcherPrompt(date, s.maxConcurrent, s.maxIterations)

    // ========================================================================
    // THE DIFFUSION LOOP
    // ========================================================================
    // This loop is bounded by maxIterations (default: 15) but will exit early
    // when the LLM calls "research_complete" tool.

    for state.Iterations < s.maxIterations {
        state.IncrementIteration()

        // ====================================================================
        // STEP 1: BUILD CONTEXT FOR THIS ITERATION
        // ====================================================================
        // Each iteration sends the LLM:
        //   - System prompt with diffusion algorithm
        //   - Current research brief
        //   - Current draft (evolving with each iteration)
        //   - Count of accumulated research notes
        //   - Conversation history (prior tool calls and results)
        //
        // This is the KEY to diffusion: context grows with each iteration!

        messages := s.buildMessages(systemPrompt, state)

        // ====================================================================
        // STEP 2: ASK LLM WHAT TO DO NEXT
        // ====================================================================
        resp, _ := s.client.Chat(ctx, messages)
        content := resp.Choices[0].Message.Content

        // ====================================================================
        // STEP 3: PARSE TOOL CALLS FROM LLM RESPONSE
        // ====================================================================
        // The LLM responds with XML-style tool calls like:
        //   <tool name="conduct_research">{"research_topic": "..."}</tool>
        //   <tool name="refine_draft">{}</tool>
        //   <tool name="research_complete">{}</tool>

        toolCalls := runtime.ParseToolCalls(content)

        // Check for research completion FIRST
        if s.hasResearchComplete(toolCalls) {
            break  // Exit the loop - research is done!
        }

        // If no tool calls, the model decided to stop
        if len(toolCalls) == 0 {
            break
        }

        // ====================================================================
        // STEP 4: SPLIT TOOL CALLS BY TYPE
        // ====================================================================
        // This is where parallelism is set up:
        //   - conduct_research calls → run in PARALLEL (separate goroutines)
        //   - think/refine_draft calls → run SEQUENTIALLY

        var conductResearchCalls []runtime.ToolCallParsed
        var otherCalls []runtime.ToolCallParsed

        for _, tc := range toolCalls {
            if tc.Tool == "conduct_research" {
                conductResearchCalls = append(conductResearchCalls, tc)
            } else {
                otherCalls = append(otherCalls, tc)
            }
        }

        // Execute sequential tools first (think, refine_draft)
        var toolResults []string
        for _, tc := range otherCalls {
            result, _ := s.executeToolCall(ctx, tc, state, ...)
            toolResults = append(toolResults, result)
        }

        // ====================================================================
        // STEP 5: EXECUTE RESEARCH IN PARALLEL
        // ====================================================================
        // This is the parallel fan-out! Each conduct_research call spawns
        // a separate sub-agent in its own goroutine.

        if len(conductResearchCalls) > 0 {
            researchResults, err := s.executeParallelResearch(
                ctx,
                conductResearchCalls,
                state,
                subResearcher,  // <-- The callback that creates sub-agents
                &researcherNum,
                &totalCost,
            )
            toolResults = append(toolResults, researchResults...)
        }

        // ====================================================================
        // STEP 6: ADD RESULTS TO CONVERSATION HISTORY
        // ====================================================================
        // Tool results are added as a "user" message so the LLM sees them
        // in the next iteration. This is how context accumulates!

        state.AddMessage(llm.Message{
            Role:    "user",
            Content: strings.Join(toolResults, "\\n\\n---\\n\\n"),
        })

        // Loop continues to next iteration...
    }

    // Return the final state after all iterations
    return &SupervisorResult{
        Notes:          state.Notes,
        DraftReport:    state.DraftReport,
        IterationsUsed: state.Iterations,
        SubInsights:    state.GetSubInsights(),
        Cost:           totalCost,
    }, nil
}
        `}
      />

      <details className="my-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Show prompt: Lead researcher (supervisor)
        </summary>
        <div className="mt-3">
          <Prompt
            label="Lead Researcher Prompt"
            className="my-0"
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
        </div>
      </details>

      <BlogHeading level={3}>The parallel research fan-out</BlogHeading>
      <p>
        When the supervisor receives multiple <code>conduct_research</code> calls in one response,
        they execute <strong>in parallel</strong>. This is where goroutines and channels come in:
      </p>
      <GoCode
        code={`
// ============================================================================
// go-research/internal/agents/supervisor.go
// ============================================================================
// executeParallelResearch fans out multiple research tasks to goroutines.
// Each sub-researcher runs independently with its own:
//   - Tool registry (search, fetch, read_document, analyze_csv, think)
//   - Conversation context (isolated from other sub-agents)
//   - Iteration budget (max 5 search calls)

func (s *SupervisorAgent) executeParallelResearch(
    ctx context.Context,
    calls []runtime.ToolCallParsed,        // Multiple conduct_research calls
    state *runtime.SupervisorState,
    subResearcher SubResearcherCallback,   // Callback to spawn each agent
    researcherNum *int,
    totalCost *session.CostBreakdown,
) ([]string, error) {

    // Channel to collect results from all goroutines
    type researchResult struct {
        index     int
        resultStr string
        insights  []runtime.SubInsight
        cost      session.CostBreakdown
        err       error
    }
    resultsChan := make(chan researchResult, len(calls))

    // WaitGroup to track when all goroutines complete
    var wg sync.WaitGroup

    // ========================================================================
    // FAN OUT: Spawn one goroutine per conduct_research call
    // ========================================================================
    for idx, toolCall := range calls {
        wg.Add(1)

        go func(index int, tc runtime.ToolCallParsed, resNum int) {
            defer wg.Done()

            // Extract the research topic from the tool call
            topic, ok := tc.Args["research_topic"].(string)
            if !ok {
                resultsChan <- researchResult{
                    index: index,
                    err:   errors.New("missing research_topic"),
                }
                return
            }

            // ================================================================
            // THIS IS WHERE THE SUB-AGENT IS SPAWNED
            // ================================================================
            // subResearcher is a callback to AgentLoop.executeSubResearch()
            // which creates a new SubResearcherAgent with its own tools.

            result, err := subResearcher(ctx, topic, resNum, state.Iterations)

            resultsChan <- researchResult{
                index:     index,
                resultStr: result.CompressedResearch,  // Findings as text
                insights:  result.Insights,            // Structured insights
                cost:      result.Cost,
                err:       err,
            }
        }(idx, toolCall, *researcherNum)

        *researcherNum++  // Increment for next sub-agent ID
    }

    // ========================================================================
    // WAIT FOR ALL GOROUTINES TO COMPLETE
    // ========================================================================
    wg.Wait()
    close(resultsChan)

    // ========================================================================
    // AGGREGATE RESULTS
    // ========================================================================
    var toolResultStrings []string
    for res := range resultsChan {
        if res.err != nil {
            toolResultStrings = append(toolResultStrings,
                fmt.Sprintf("Research error: %v", res.err))
            continue
        }

        // Add findings to supervisor state
        state.AddNote(res.resultStr)
        state.AddSubInsights(res.insights)
        totalCost.Add(res.cost)

        toolResultStrings = append(toolResultStrings,
            fmt.Sprintf("Research findings:\\n%s", res.resultStr))
    }

    return toolResultStrings, nil
}
        `}
      />

      <BlogHeading level={3}>What each sub-researcher actually does</BlogHeading>
      <p>
        Each sub-researcher is a complete agent with its own tool loop. It receives only the topic
        (no visibility into other agents&apos; work) and runs its own search/analysis cycle:
      </p>
      <GoCode
        code={`
// ============================================================================
// go-research/internal/architectures/think_deep/loop.go
// ============================================================================
// executeSubResearch is the callback passed to the supervisor.
// It creates a new sub-agent with isolated tools and context.

func (o *AgentLoop) executeSubResearch(
    ctx context.Context,
    topic string,              // The research question from supervisor
    researcherNum int,         // Unique ID for this sub-agent
    diffusionIteration int,    // Which supervisor iteration spawned this
) (*agents.SubResearcherResult, error) {

    // ========================================================================
    // BUILD DEDICATED TOOL REGISTRY
    // ========================================================================
    // Each sub-agent gets its own set of tools:
    //   - search: Web search via Brave API
    //   - fetch: Fetch and summarize a specific URL
    //   - read_document: Read PDF, DOCX, XLSX files
    //   - analyze_csv: Statistical analysis of CSV data
    //   - think: Internal reflection (preserved in conversation)

    subTools := runtime.SubResearcherToolRegistry(
        o.appConfig.BraveAPIKey,
        o.client,  // LLM client for summarization within tools
    )

    // ========================================================================
    // CREATE THE SUB-AGENT
    // ========================================================================
    // The agent has:
    //   - Its own conversation context (cannot see other agents)
    //   - Strict iteration limits (max 5 search calls)
    //   - Event bus for progress updates

    subResearcher := agents.NewSubResearcherAgent(
        o.client,
        subTools,
        o.bus,
        agents.DefaultSubResearcherConfig(),  // maxIterations: 5
    )

    // ========================================================================
    // RUN THE SUB-AGENT'S OWN LOOP
    // ========================================================================
    // The sub-agent runs its own tool-calling loop:
    //   1. Receive topic as initial message
    //   2. Call think to plan search strategy
    //   3. Call search/fetch/read_document to gather info
    //   4. Call think to assess what's missing
    //   5. Repeat until confident or budget exhausted
    //   6. Compress findings and return

    return subResearcher.Research(ctx, topic, researcherNum)
}

// ============================================================================
// go-research/internal/agents/sub_researcher.go
// ============================================================================
// SubResearcherAgent.Research runs the actual search/analysis loop.

func (a *SubResearcherAgent) Research(
    ctx context.Context,
    topic string,
    researcherNum int,
) (*SubResearcherResult, error) {

    // Build system prompt with search instructions and limits
    systemPrompt := runtime.ResearchAgentPrompt(time.Now().Format("2006-01-02"))

    messages := []llm.Message{
        {Role: "system", Content: systemPrompt},
        {Role: "user", Content: topic},  // The research question
    }

    // ========================================================================
    // THE SUB-AGENT'S TOOL LOOP
    // ========================================================================
    for iterations := 0; iterations < a.maxIterations; iterations++ {
        resp, _ := a.client.Chat(ctx, messages)
        content := resp.Choices[0].Message.Content

        // Parse and execute tool calls (search, fetch, think, etc.)
        toolCalls := runtime.ParseToolCalls(content)

        if len(toolCalls) == 0 {
            break  // Agent decided to stop searching
        }

        // Execute each tool and collect results
        var results []string
        for _, tc := range toolCalls {
            result, _ := a.tools.Execute(ctx, tc.Tool, tc.Args)
            results = append(results, result)

            // Track visited URLs for deduplication
            if tc.Tool == "fetch" {
                if url, ok := tc.Args["url"].(string); ok {
                    a.visitedURLs[url] = true
                }
            }
        }

        // Add results to conversation
        messages = append(messages, llm.Message{
            Role:    "user",
            Content: strings.Join(results, "\\n---\\n"),
        })
    }

    // ========================================================================
    // COMPRESS FINDINGS
    // ========================================================================
    // Before returning, compress the research into a structured format
    // while preserving ALL information verbatim.

    compressed, _ := a.compressResearch(ctx, messages)

    return &SubResearcherResult{
        CompressedResearch: compressed,
        RawNotes:          rawNotes,
        Insights:          extractedInsights,
        Cost:              totalCost,
    }, nil
}
        `}
      />

      <details className="my-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Show prompt: Sub-researcher (tool loop)
        </summary>
        <div className="mt-3">
          <Prompt
            label="Sub-Researcher Prompt"
            className="my-0"
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
        </div>
      </details>

      <details className="my-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Show prompt: Research compression (sub-agent → supervisor)
        </summary>
        <div className="mt-3">
          <Prompt
            label="Research Compression Prompt"
            className="my-0"
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
        </div>
      </details>

      <BlogHeading level={3}>Phase 4: Final report synthesis</BlogHeading>
      <p>
        After the diffusion loop completes, the final phase synthesizes everything into a polished
        report. This applies the Insightfulness + Helpfulness quality rules:
      </p>
      <GoCode
        code={`
// ============================================================================
// PHASE 4: FINAL REPORT GENERATION
// ============================================================================
// After diffusion completes, generate the final polished report.
// This phase:
//   1. Deduplicates findings by URL (avoid citing same source twice)
//   2. Applies Insightfulness rules (granular breakdown, mapping tables)
//   3. Applies Helpfulness rules (proper citations, markdown formatting)

func (o *AgentLoop) Research(ctx context.Context, query string) (*LoopResult, error) {
    // ... Phase 1, 2, 3 above ...

    // ========================================================================
    // PHASE 4: FINAL REPORT
    // ========================================================================
    // Combine the refined draft with all accumulated research findings
    // to produce the final deliverable.

    finalReport, reportCost, err := o.generateFinalReport(
        ctx,
        researchBrief,
        supervisorResult,  // Contains draft + notes + insights
    )

    return &LoopResult{
        Query:         query,
        ResearchBrief: researchBrief,
        Notes:         supervisorResult.Notes,
        DraftReport:   supervisorResult.DraftReport,
        FinalReport:   finalReport,
        SubInsights:   supervisorResult.SubInsights,
        Cost:          totalCost,
        Duration:      time.Since(startTime),
    }, nil
}

// generateFinalReport applies quality rules and deduplication
func (o *AgentLoop) generateFinalReport(
    ctx context.Context,
    brief string,
    supervisor *agents.SupervisorResult,
) (string, session.CostBreakdown, error) {

    // ========================================================================
    // DEDUPLICATE FINDINGS BY URL
    // ========================================================================
    // Multiple sub-agents may have found the same sources.
    // Remove notes that contain only URLs we've already seen.

    deduplicatedNotes := o.deduplicateFindings(supervisor.Notes)
    findings := strings.Join(deduplicatedNotes, "\\n\\n---\\n\\n")

    // ========================================================================
    // APPLY QUALITY RULES VIA PROMPT
    // ========================================================================
    // FinalReportPrompt includes:
    //   - Insightfulness rules (granular breakdown, mapping tables)
    //   - Helpfulness rules (citations, markdown, structure)
    //   - All accumulated research findings
    //   - The refined draft from diffusion

    prompt := runtime.FinalReportPrompt(
        brief,
        findings,
        supervisor.DraftReport,
        time.Now().Format("2006-01-02"),
    )

    resp, _ := o.client.Chat(ctx, []llm.Message{
        {Role: "user", Content: prompt},
    })

    return resp.Choices[0].Message.Content, cost, nil
}
        `}
      />

      <details className="my-4">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Show prompt: Final report (quality rules)
        </summary>
        <div className="mt-3">
          <Prompt
            label="Final Report Prompt"
            className="my-0"
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
        </div>
      </details>

      <Callout variant="info">
        <strong>The key insight:</strong> Unlike traditional pipelines that generate content in one pass,
        diffusion builds the report iteratively. Each supervisor iteration sees the <em>current</em> draft
        and <em>accumulated</em> research, allowing the system to self-correct and fill gaps it discovers
        along the way. This is why the loop checks findings completeness, not draft polish.
      </Callout>

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
