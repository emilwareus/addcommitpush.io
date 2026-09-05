import {
  BlogHeading,
  BlogLink,
  BlogList,
  BlogListItem,
  Terminal,
} from '@/components/custom';
import { CodeBlock } from '@/components/blog-posts/code-block';

const tableWrap =
  'not-prose my-8 overflow-x-auto border border-dashed border-border';
const tableClass =
  'w-full border-collapse text-sm [&_tbody_tr:nth-child(even)]:bg-[var(--hover)]';
const thClass =
  'border-b border-dashed border-border bg-[var(--hover)] p-3 text-left font-semibold text-primary';
const tdClass = 'border-b border-border/70 p-3 align-top';

export function StaticAnalysisTutorialContent() {
  return (
    <>
      <div
        className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-accent
        prose-ul:text-foreground prose-ul:my-6
        prose-li:text-foreground prose-li:my-2
        prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono
        prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg"
      >
        <p>
          Every null dereference is obvious after production finds it. Every command
          injection is obvious after the incident review. Before that, both are ordinary
          lines in a pull request, surrounded by enough correct code that human pattern
          matching gives up and goes for coffee.
        </p>
        <p>
          I spent a few years at Debricked building and selling tooling in this space, and
          I learned a thing or two about what these machines can and cannot do. The
          machinery was always the interesting part to me: how source text becomes a graph,
          how facts move across that graph, and how much uncertainty you can afford before
          CI turns into a very expensive random number generator.
        </p>
        <p>
          The short version: every technique in this post is a precision budget. The skill
          is knowing what yours buys. If you want the <em>why</em>, I wrote the manifesto
          version in{' '}
          <BlogLink href="/blog/the-rules-of-vibe-coding">The Rules of Vibe Coding</BlogLink>.
          This post is the how.
        </p>
        <p>
          <strong>Who is this for?</strong> You have been programming for 5+ years. You know
          what a type checker is, you have written a regex-based lint rule at some point,
          but the space between &quot;my linter complains&quot; and &quot;CodeQL found a
          variant of a real CVE&quot; is a black box. This post opens that box. I will try
          to explain how the machines work, and for each one: what you can actually expect
          it to find, with what accuracy, and where it lies to you.
        </p>
        <p>My rough map of the territory:</p>
        <BlogList variant="unordered">
          <BlogListItem>Parsing and IR: turning text into something a machine can reason about</BlogListItem>
          <BlogListItem>Control-flow graphs: execution order, and what guards protect what</BlogListItem>
          <BlogListItem>Call graphs: who can call whom, and why that is a precision budget</BlogListItem>
          <BlogListItem>Dataflow and abstract interpretation: pushing facts until nothing changes</BlogListItem>
          <BlogListItem>Taint analysis: the security workhorse, and why it is modeling, not magic</BlogListItem>
          <BlogListItem>Symbolic execution: asking a solver for a concrete input that breaks your code</BlogListItem>
          <BlogListItem>Type systems: the static analyzer you already use every day</BlogListItem>
          <BlogListItem>False positives, and why coding agents make good diagnostics worth real money</BlogListItem>
        </BlogList>

        <BlogHeading level={2}>Key takeaways</BlogHeading>
        <BlogList variant="unordered">
          <BlogListItem>
            An analyzer lowers source code through syntax trees and an IR before it asks any
            semantic questions. Every stage drops detail, and what it drops decides what it
            can prove.
          </BlogListItem>
          <BlogListItem>
            Control flow is near-exact for structured code. Call graphs are not: dynamic
            dispatch, reflection, and callbacks force approximations, and the algorithm you
            pick (CHA, RTA, VTA, points-to) is a precision budget for everything downstream.
          </BlogListItem>
          <BlogListItem>
            Dataflow solvers push facts along CFG edges until a fixed point. Soundness,
            precision, and cost pull in different directions. Every useful tool picks a
            position, whether the marketing page admits it or not.
          </BlogListItem>
          <BlogListItem>
            Taint analysis lives or dies on its source, sink, sanitizer, and library models.
            The graph search is often the less embarrassing part.
          </BlogListItem>
          <BlogListItem>
            Deterministic, structured diagnostics give humans and coding agents a bounded
            repair loop. Vague warnings give everyone a chance to improvise badly.
          </BlogListItem>
        </BlogList>

        <BlogHeading level={2}>What is static analysis?</BlogHeading>
        <p>
          Static analysis reasons about program properties without running the program. One
          rule inspects syntax, another proves a type relation, a third approximates every
          path through a function, a fourth searches for a source-to-sink flow. Different
          analyses, same contract: derive facts from code and configuration, then report
          what follows from the model.
        </p>
        <CodeBlock
          code={`type Session = { userId: string };

function accountPath(session: Session | undefined): string {
  return "/accounts/" + session.userId;
  // Type checker: 'session' is possibly 'undefined'.
}`}
          language="typescript"
        />
        <p>
          The analyzer never needed a request that forgets the session. The type{' '}
          <code>Session | undefined</code> describes both states at once, and the property
          access is invalid in one of them. That small proof is static analysis in its most
          familiar form.
        </p>
        <blockquote>
          <p>
            &quot;Static&quot; describes the evidence, not the implementation. The analyzer
            runs plenty of code. It just never uses concrete executions of your program as
            its source of truth.
          </p>
        </blockquote>

        <BlogHeading level={2}>The pipeline: source code to analysis facts</BlogHeading>
        <p>
          An analyzer can&apos;t do much with a UTF-8 byte at offset 418. So it lexes
          characters into tokens, parses tokens into a syntax tree, resolves names and
          types, and then usually lowers the result into an intermediate representation
          (IR). Each stage drops syntax trivia and adds facts that later stages would
          otherwise have to rediscover.
        </p>
        <CodeBlock code={`const retryDelay = baseDelay * 2;`} language="typescript" />
        <p>
          A Tree-sitter concrete syntax tree for that line keeps punctuation and source
          positions, because editors need them. A compiler AST throws more of that surface
          detail away.
        </p>
        <CodeBlock
          code={`(lexical_declaration
  (variable_declarator
    name: (identifier)                 ; retryDelay
    value: (binary_expression
      left: (identifier)               ; baseDelay
      operator: "*"
      right: (number))))               ; 2`}
          language="text"
        />
        <p>
          One more lowering pass and <code>baseDelay</code> becomes symbol 27 with type{' '}
          <code>number</code> attached, and the expression becomes three-address IR.
          Analyses now see explicit operations instead of every legal spelling of a
          TypeScript expression.
        </p>
        <CodeBlock
          code={`t0 = load symbol#27        // baseDelay: number
t1 = multiply t0, 2
store symbol#31, t1       // retryDelay: number`}
          language="text"
        />
        <blockquote>
          <p>
            Parsing decides what the code says. Lowering decides which differences still
            matter to the analysis.
          </p>
        </blockquote>
        <p>
          That second decision is where analyzer design starts. Desugar an optional chain
          into branches and control-flow analysis gets easier. Erase field identity and heap
          analysis gets cheaper, but your taint results get noisier. There is no neutral IR.
        </p>
        <p>
          <strong>What you can do at this level:</strong> syntax rules with exact source
          spans. &quot;No raw colors in JSX&quot;, &quot;no <code>console.log</code> in
          production paths&quot;, &quot;this deprecated import is gone&quot;. Parsing is a
          solved problem for mainstream languages, so expect near-perfect accuracy and
          near-zero false positives, as long as the rule is truly syntactic. The moment your
          rule needs to know which <em>value</em> flows somewhere, syntax is not enough, and
          you need the machinery below.
        </p>

        <BlogHeading level={2}>
          Control-flow graphs make execution order explicit
        </BlogHeading>
        <p>
          A control-flow graph (CFG) is basic blocks connected by possible transfers of
          control. A basic block has one entry and one exit. Branches end blocks, jump
          targets begin them, loops add edges back to earlier blocks.
        </p>
        <CodeBlock
          code={`function deliveryFee(totalCents: number, isMember: boolean): number {
  let fee = 799;

  if (isMember || totalCents >= 5_000) {
    fee = 0;
  } else {
    fee = 499;
  }

  return fee;
}`}
          language="typescript"
        />
        <CodeBlock
          code={`[entry]
   |
   v
[fee = 799]
   |
   v
[isMember?] -- true ------------------+
   | false                            |
   v                                  |
[totalCents >= 5000?] -- true --------+
   | false                            |
   v                                  v
[fee = 499]                       [fee = 0]
   |                                  |
   +---------------+------------------+
                   v
              [return fee]`}
          language="text"
        />
        <p>
          Every dataflow analysis trusts these edges, so forgetting an exception, a{' '}
          <code>finally</code>, a callback, or a short-circuit edge poisons everything
          downstream with impressive efficiency.
        </p>
        <p>
          Dominators are the first graph relation worth keeping in your pocket. Block A
          dominates block B when every path from entry to B passes through A. Compilers use
          the dominator tree to build SSA. Policy analyzers use the same relation to prove
          that an authorization guard runs before a side effect.
        </p>
        <CodeBlock
          code={`// The guard dominates issueRefund(). Removing the early return breaks that fact.
function refund(order: Order, actor: User): void {
  if (!actor.permissions.includes("refund")) return;

  issueRefund(order.paymentId);
}`}
          language="typescript"
        />
        <p>
          <strong>What you can find with a CFG:</strong> missing guards (&quot;every path to{' '}
          <code>issueRefund</code> must pass the permission check&quot;), unreachable code,
          missing cleanup (&quot;every opened transaction is closed on every path, including
          the error path&quot;), secrets that only leak on exception paths. These are real
          vulnerability classes: auth bypass by early-return bug, resource leaks that
          exhaust file handles under load, stack traces carrying tokens to a log sink.
        </p>
        <p>
          <strong>What accuracy to expect:</strong> for structured control flow (if, else,
          loops, return), CFG construction is essentially exact. The accuracy cliff is
          implicit control flow: exceptions, async callbacks, <code>finally</code>, and
          framework entrypoints the analyzer never saw. A perfect solver over a wrong CFG
          produces a perfectly stable wrong answer. So when you evaluate a tool, test CFG
          construction first: early returns, thrown errors, cleanup blocks, and the
          framework glue your repository actually uses.
        </p>

        <BlogHeading level={2}>Call graphs are precision budgets</BlogHeading>
        <p>
          A call graph maps caller to callee. Direct calls are easy: <code>refund()</code>{' '}
          names its target in the source. The trouble is everything else. Interface
          dispatch, closures, dependency injection, route tables, reflection, dynamic
          imports. Which concrete method can <code>w.Write(data)</code> actually call?
        </p>
        <p>
          If the analyzer includes too many targets, every downstream rule inherits false
          positives. If it misses targets, you get false negatives and false confidence. The
          classic ladder of algorithms, nicely documented by{' '}
          <BlogLink href="https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/">
            SootUp
          </BlogLink>{' '}
          and Go&apos;s <code>callgraph</code> packages, is a sequence of filters:
        </p>
        <div className={tableWrap}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Algorithm</th>
                <th className={thClass}>Information used</th>
                <th className={thClass}>Approximation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}>CHA</td>
                <td className={tdClass}>Type hierarchy</td>
                <td className={tdClass}>
                  Any implementer of the declared receiver type can be called
                </td>
              </tr>
              <tr>
                <td className={tdClass}>RTA</td>
                <td className={tdClass}>Hierarchy + instantiated types</td>
                <td className={tdClass}>
                  Only implementers actually allocated in reachable code
                </td>
              </tr>
              <tr>
                <td className={tdClass}>VTA</td>
                <td className={tdClass}>Instantiated types + assignment flow</td>
                <td className={tdClass}>
                  Only types whose values can reach this receiver
                </td>
              </tr>
              <tr>
                <td className={tdClass}>Points-to</td>
                <td className={tdClass}>Abstract heap objects</td>
                <td className={tdClass}>
                  Which allocation sites this receiver may point to
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          CHA&apos;s failure mode is easy to see: if an interface has 30 implementers and
          your receiver can only ever hold one, CHA still adds all 30 edges. RTA removes the
          implementers nothing ever allocates. VTA removes the ones whose values never flow
          to that receiver. Each rung costs more facts.
        </p>
        <p>
          <strong>How wrong can a cheap call graph be?</strong> Embarrassingly wrong. The
          ISSTA 2024 paper{' '}
          <BlogLink href="https://www.opal-project.de/articles/TotalRecall%40ISSTA24.pdf">
            &quot;Total Recall? How Good Are Static Call Graphs Really?&quot;
          </BlogLink>{' '}
          measured CHA-built Java call graphs against dynamic runs and got numbers like 7.3%
          method precision and 0.9% edge precision on one benchmark. Yes, under one percent
          of the edges were ever observed. CHA is a safety net, not a map.
        </p>
        <p>
          The good news: you often do not need the fanciest graph. The classic
          Tip/Palsberg{' '}
          <BlogLink href="http://web.cs.ucla.edu/~palsberg/paper/oopsla00.pdf">
            OOPSLA 2000 study
          </BlogLink>{' '}
          found propagation-based algorithms between RTA and 0-CFA removed up to 29% of call
          edges versus RTA, but reachable method counts barely moved (1.6% average
          reduction). Edge precision improves long before reachability does. Meanwhile
          context-sensitive points-to can get expensive fast: the Souffle authors reported
          context-insensitive points-to on OpenJDK in 35 seconds and 8.5 GB, while a
          context-sensitive variant needed almost 7 hours and 206 GB. Size is not precision,
          and precision is not free.
        </p>
        <p>
          <strong>What you can do with a call graph:</strong> reachability policies
          (&quot;no production HTTP route reaches <code>dangerousAdmin</code>&quot;), dead
          code detection, and the skeleton for interprocedural taint. Expect direct calls to
          be exact, interface dispatch to be decent with RTA/VTA in a mostly-closed
          codebase, and reflection plus dynamic imports to be honestly unknown. Go&apos;s
          VTA docs say it plainly: sound modulo reflection and <code>unsafe</code>. That
          caveat should show up in your diagnostics, not just the paper. When a tool
          silently drops those edges and reports &quot;clean&quot;, it is lying to you with
          confidence. For the long version, see{' '}
          <BlogLink href="/brain/call-graphs-are-precision-budgets">
            Call Graphs Are Precision Budgets
          </BlogLink>
          .
        </p>

        <BlogHeading level={2}>Dataflow analysis is a fixed-point computation</BlogHeading>
        <p>
          Dataflow analysis attaches a fact to each program point. Reaching definitions asks
          which assignments may reach a use. Live-variable analysis asks which values may be
          read later. Definite assignment asks what must have happened on every incoming
          path. Different questions, same engine.
        </p>
        <p>
          Before the machinery, the expectation. Within a single function, dataflow is
          accurate. Across functions, accuracy is whatever your call graph and summaries
          give you, and most tools draw the line lower than their landing page suggests.
          Semgrep CE, for example, documents its data flow as intraprocedural, with default
          guardrails like a 5 second timeout per rule per file and a 1 MB max target size.
          That is a bounded product, not a proof that every path was analyzed. Know which
          tier your tool actually runs at, then the machinery below tells you what that tier
          means.
        </p>
        <BlogHeading level={3}>Lattices tell the engine how facts combine</BlogHeading>
        <p>
          A lattice is a set of abstract states plus an ordering and a join operation. For
          reaching definitions, a state is a set of assignment IDs, the order is set
          inclusion, <code>bottom</code> is the empty set, and join is union. Transfer
          functions describe how one instruction changes that set.
        </p>
        <CodeBlock
          code={`node: retries = retries + 1

GEN[node]  = { definition_of_retries_at_node }
KILL[node] = { every_other_definition_of_retries }

OUT[node] = GEN[node] union (IN[node] - KILL[node])`}
          language="text"
        />
        <BlogHeading level={3}>
          The worklist keeps iterating until nothing changes
        </BlogHeading>
        <p>
          Loops make the equations recursive, so you iterate. The standard solver puts
          blocks on a worklist, applies their transfer functions, and requeues successors
          whenever an output changes. A finite-height lattice plus monotone transfer
          functions guarantees termination, because a block&apos;s state can only move
          upward finitely many times.
        </p>
        <CodeBlock
          code={`REACHING_DEFINITIONS(cfg):
  for each block b:
    IN[b]  = empty_set
    OUT[b] = empty_set

  worklist = all_blocks(cfg)

  while worklist is not empty:
    b = worklist.pop()
    new_in  = union(OUT[p] for p in predecessors(b))
    new_out = GEN[b] union (new_in - KILL[b])

    if new_in != IN[b] or new_out != OUT[b]:
      IN[b]  = new_in
      OUT[b] = new_out
      worklist.add_all(successors(b))

  return IN, OUT`}
          language="text"
        />
        <p>
          The result is a fixed point: apply every transfer function again and nothing
          changes. Reverse postorder usually gets there with fewer visits, but ordering
          changes runtime, never meaning. The{' '}
          <BlogLink href="https://clang.llvm.org/docs/DataflowAnalysisIntro.html">
            Clang dataflow guide
          </BlogLink>{' '}
          walks through this same equation with value sets and <code>top</code>/
          <code>bottom</code> states.
        </p>
        <BlogHeading level={3}>May and must analyses answer different questions</BlogHeading>
        <p>
          Reaching definitions is a <em>may</em> analysis. A definition reaches a use if it
          travels along <em>some</em> path, so joins take the union and the fact set grows.
          Over-approximating is what you want for bug finding: a value that maybe reaches a
          sink is worth a report. Liveness is also a may analysis, just running backward.
        </p>
        <p>
          Definite assignment is a <em>must</em> analysis. A variable counts as assigned
          only if it was assigned on <em>every</em> incoming path, so joins take the
          intersection and facts shrink. You reach for must-reasoning when one missing path
          breaks the conclusion: proving a variable is initialized, proving a lock is held.
          Same worklist, same fixed point. The join operator decides which question you
          asked.
        </p>
        <BlogHeading level={3}>A live-variable analysis by hand</BlogHeading>
        <p>
          Liveness runs backward. A variable is live before a statement when some later path
          reads its current value before overwriting it. The transfer equation is{' '}
          <code>IN = USE union (OUT - DEF)</code>.
        </p>
        <CodeBlock
          code={`function receiptTotal(subtotal: number): number {
  let tax = subtotal * 0.2;       // 1
  let total = subtotal + tax;     // 2
  tax = 0;                        // 3: dead store
  return total;                   // 4
}`}
          language="typescript"
        />
        <CodeBlock
          code={`Walk backward:

after  line 4: {}
before line 4: { total }
before line 3: { total }          // old tax is not needed
before line 2: { subtotal, tax }
before line 1: { subtotal }

Line 3 defines tax, but tax is not live afterward. The assignment is dead.`}
          language="text"
        />
        <p>
          <strong>What you can find with dataflow:</strong> use-before-initialization, dead
          stores, variables that stay alive longer than they should (think secrets lingering
          in memory), and the local part of every taint rule. For the full engine treatment,
          see{' '}
          <BlogLink href="/brain/data-flow-engines-are-fixed-point-machines">
            Data-Flow Engines Are Fixed-Point Machines
          </BlogLink>
          .
        </p>

        <BlogHeading level={2}>
          Abstract interpretation trades concrete states for useful ones
        </BlogHeading>
        <p>
          Concrete execution tracks one value: <code>attempts = 4</code>. Abstract
          interpretation tracks a property of many values: <code>attempts in [0, 8]</code>.
          The analyzer runs abstract versions of addition, comparison, assignment, and join
          over that smaller domain.
        </p>
        <CodeBlock
          code={`def retry_count(requested: int) -> int:
    attempts = 0
    while attempts < requested and attempts < 8:
        attempts += 1
    return attempts

# Interval analysis, assuming requested >= 0:
# entry:      attempts = [0, 0]
# loop head:  [0, 0] -> [0, 1] -> [0, 2] -> ...
# fixed point after widening/refinement: attempts = [0, 8]`}
          language="python"
        />
        <p>
          Infinite ascending chains need widening. Instead of enumerating{' '}
          <code>[0, 0], [0, 1], [0, 2]</code> forever, the analyzer jumps to a coarser bound
          that must stabilize, then may run a bounded narrowing pass to win precision back.
          Widening is a semantic choice, not just an optimization. It changes which alarms
          you get.
        </p>
        <BlogHeading level={3}>Galois connections without the ceremonial robes</BlogHeading>
        <p>
          The theory has one idea worth keeping. An abstraction function <code>alpha</code>{' '}
          maps concrete states to abstract values (<code>{'{0,1,2,3,4}'} -&gt; [0, 4]</code>
          ). A concretization function <code>gamma</code> maps back. A Galois connection
          says the two agree about what is safely represented, which is what makes an
          abstract transfer function provably cover its concrete one. The names are scarier
          than the idea, and the idea is why &quot;sound&quot; can ever be more than a
          marketing word.
        </p>
        <BlogHeading level={3}>Soundness, completeness, and cost</BlogHeading>
        <p>
          For arbitrary programs and nontrivial semantic properties, a terminating analyzer
          cannot be both sound and complete. That is the halting problem wearing a linter
          badge. Restricted languages and properties can do better, so read every soundness
          claim with its model and assumptions attached.
        </p>
        <p>
          Rust&apos;s borrow checker soundly enforces ownership and borrowing for safe Rust,
          while <code>unsafe</code> blocks carry obligations the checker cannot prove.{' '}
          <BlogLink href="https://www.absint.com/astree/index.htm">Astrée</BlogLink> uses
          abstract interpretation to prove the absence of specified runtime errors in
          safety-critical C, under an explicit target and environment model. Neither claim
          means &quot;all possible bugs in all programs.&quot;
        </p>
        <blockquote>
          <p>
            Ask what a tool over-approximates, what it ignores, and what forces it to widen.
            The word &quot;sound&quot; without those boundaries is decorative.
          </p>
        </blockquote>
        <p>
          <strong>What you can find with abstract interpretation:</strong> division by zero,
          integer overflow, out-of-bounds indexes, null dereferences, dead configurations.
          In the hands of a general-purpose linter, expect a noisy version of this: the
          interval widens, the alarm fires anyway, and you get the classic &quot;possibly
          maybe&quot; warning. In the hands of a tool like Astrée, run by experts on a
          bounded codebase with a modeled environment, you get zero-false-negative proofs.
          Same theory, different budget.
        </p>

        <BlogHeading level={2}>Taint analysis is modeling, not magic</BlogHeading>
        <p>
          Taint analysis marks values from sources, propagates labels through assignments
          and calls, removes labels at sanitizers, and reports when a forbidden label
          reaches a sink. This is the engine behind most SAST security findings, and it is
          where I spent a lot of my Debricked years watching customers succeed and fail.
          The failures were almost never the graph search. They were the model.
        </p>
        <CodeBlock
          code={`rules:
  - id: request-data-to-shell
    message: Request data reaches child_process.exec without validation
    severity: ERROR
    languages: [typescript]
    mode: taint
    pattern-sources:
      - pattern: $REQUEST.query.$KEY
    pattern-sinks:
      - pattern: exec($COMMAND, ...)
    pattern-sanitizers:
      - pattern: parseExportFormat($VALUE)
    pattern-propagators:
      - pattern: $COMMANDS.push($VALUE)
        from: $VALUE
        to: $COMMANDS`}
          language="text"
        />
        <p>
          That is the shape of a{' '}
          <BlogLink href="https://semgrep.dev/docs/writing-rules/data-flow/taint-mode">
            Semgrep taint rule
          </BlogLink>
          . The source is request data, the sink is shell execution, the sanitizer names a
          local parsing contract, and the propagator teaches the engine that pushing into a
          collection transfers influence. Default assignment flow alone will never infer
          every builder, callback, ORM, or container API your codebase invented on a
          Thursday.
        </p>
        <CodeBlock
          code={`import { exec } from "node:child_process";
import type { Request } from "express";

function runExport(request: Request): void {
  const format = String(request.query.format);
  const command = "./export-report --format " + format;
  exec(command); // source -> concatenation -> command -> sink
}`}
          language="typescript"
        />
        <p>
          <strong>What you can find with taint analysis:</strong> the OWASP classics, when
          the model is right. Command injection (above), SQL injection, XSS, path traversal,
          SSRF, log injection, deserialization of untrusted data. The shared shape is always
          &quot;attacker-controlled value reaches dangerous interpreter&quot;. FlowDroid,
          the academic reference point for Android taint, reported 93% recall and 86%
          precision on the DroidBench benchmark back in 2014. That is the good-case
          calibration: a well-modeled, well-benchmarked engine on a known test suite. Real
          repositories with custom frameworks do worse, mostly on the model side.
        </p>
        <p>
          Sanitizers are the dangerous part of the model. HTML escaping does not make a
          value safe for SQL, and SQL parameterization does not give you a shell argument
          allowlist. <code>String(input)</code> is a conversion, not a validation. A finding
          suppressed by the wrong sanitizer is a false negative you chose yourself.
        </p>
        <CodeBlock
          code={`sanitize_html(input)    // maybe safe for HTML, not SQL
escape_sql(input)       // maybe safe for SQL, not shell
validate_command(input) // safe only if the allowlist is correct
String(input)           // conversion, not validation`}
          language="text"
        />
        <p>
          Field sensitivity, aliasing, access-path depth, implicit flows, and unknown
          callees decide whether the engine tracks the actual value or a vaguely related
          object. Treating an unmodeled call as &quot;no flow&quot; is false confidence. I
          have watched a customer celebrate a &quot;clean&quot; scan that turned out to mean
          &quot;the analyzer never modeled their framework&apos;s entrypoints.&quot; Clean
          and not-analyzed look identical behind a green CI badge. A serious analyzer
          propagates conservatively, applies a configured summary, or emits an explicit
          unknown result. Unknown is honesty. Silence is not evidence of sanitization. For
          the long version, see{' '}
          <BlogLink href="/brain/taint-analysis-is-modeling-not-magic">
            Taint Analysis Is Modeling, Not Magic
          </BlogLink>
          .
        </p>

        <BlogHeading level={2}>Symbolic execution keeps paths separate</BlogHeading>
        <p>
          Abstract interpretation merges states at joins. Symbolic execution does the
          opposite: inputs become symbols, the engine forks at every branch, and each state
          carries its own path constraint. An SMT solver checks whether a constraint is
          satisfiable and, when it is, hands back a concrete input that drives the program
          down that path.
        </p>
        <CodeBlock
          code={`def shipping_band(weight: int, zone: int) -> int:
    if weight < 0:
        raise ValueError("negative weight")

    if zone == 4 and weight > 20:
        return 3

    return 1

# Symbolic inputs: W, Z
# Path to return 3: W >= 0 and Z == 4 and W > 20
# Solver witness: W = 21, Z = 4`}
          language="python"
        />
        <p>
          <BlogLink href="https://klee-se.org/">KLEE</BlogLink> executes LLVM bitcode this
          way. A satisfiable path ending in an assertion failure or an out-of-bounds access
          becomes a regression-test input. That concrete witness is where symbolic execution
          beats a coarser analysis that merged the interesting relation into{' '}
          <code>unknown</code>.
        </p>
        <CodeBlock
          code={`state_0 = { weight = W, zone = Z, PC = true }

branch weight < 0:
  state_1.PC = W < 0
  state_2.PC = W >= 0

branch zone == 4 and weight > 20 from state_2:
  state_3.PC = W >= 0 and Z == 4 and W > 20
  state_4.PC = W >= 0 and not (Z == 4 and W > 20)

solve(state_3.PC) -> SAT { W = 21, Z = 4 }`}
          language="text"
        />
        <p>
          The bill arrives as path explosion. Every independent branch can double the state
          count, and loops, recursion, symbolic memory, syscalls, hashes, and nonlinear
          arithmetic make solving worse. Concolic testing runs one concrete execution while
          collecting symbolic constraints, then negates selected branches to find new
          inputs. It covers useful paths without pretending it exhausted the program.
        </p>
        <p>
          <strong>What you can find with symbolic execution:</strong> assertion violations,
          buffer overflows, arithmetic edge cases, and automatically generated test inputs
          that hit them. Expect it to shine on bounded, low-level, self-contained code:
          parsers, codecs, state machines, protocol logic. Expect it to choke on a typical
          web service with a database, a queue, and three frameworks. When it works, the
          output is a gift: not &quot;line 42 looks suspicious&quot; but &quot;here is the
          exact input that crashes it&quot;.
        </p>

        <BlogHeading level={2}>Type systems are the static analyzer you already use</BlogHeading>
        <p>
          A type checker maps runtime values into a smaller domain of types and proves that
          operations respect the language&apos;s rules. Hindley-Milner inference assigns
          fresh type variables, collects constraints from applications, unifies them, and
          generalizes eligible variables at <code>let</code> bindings. You get polymorphism
          without writing a type on every local.
        </p>
        <CodeBlock
          code={`identity = \\value -> value

value    : alpha
identity : alpha -> alpha

generalize at the let binding:
identity : forall alpha. alpha -> alpha

identity(42)      constrains alpha = Int
identity("paid")  constrains a fresh alpha = String`}
          language="text"
        />
        <p>
          Gradual typing deliberately mixes checked and less-checked regions.
          TypeScript&apos;s <code>unknown</code> forces narrowing at a boundary.{' '}
          <code>any</code> mostly switches the checker off for every value flowing through
          it, which can be the right migration trade. Just remember that the guarantee
          shrinks exactly where <code>any</code> spreads.
        </p>
        <CodeBlock
          code={`type WebhookPayload = { invoiceId: string };

function parseWebhook(payload: unknown): WebhookPayload {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("invoiceId" in payload) ||
    typeof payload.invoiceId !== "string"
  ) {
    throw new Error("invalid webhook payload");
  }

  return { invoiceId: payload.invoiceId };
}`}
          language="typescript"
        />
        <p>
          Rust adds ownership to the type discipline. Non-<code>Copy</code> values behave
          affinely: consume them at most once, unless the code explicitly creates another
          owned value. A possible double-use of a capability becomes a type error.
        </p>
        <CodeBlock
          code={`struct RefundToken(String);

fn submit_refund(token: RefundToken) {
    println!("submitting {}", token.0);
}

fn main() {
    let token = RefundToken("refund_901".to_owned());
    submit_refund(token);
    submit_refund(token);
    // error[E0382]: use of moved value: token
}`}
          language="rust"
        />
        <p>
          The{' '}
          <BlogLink href="https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html">
            Rust ownership chapter
          </BlogLink>{' '}
          walks through the same mechanism with heap-owning strings. The checker catches use
          after move before a test even has the chance to get lucky.
        </p>
        <p>
          <strong>What you can expect here:</strong> this is the highest-precision,
          lowest-false-positive analysis you own, because programmers write the annotations
          themselves and the language defines the contract. Whole classes of bugs (wrong
          argument shape, forgotten null, use after move) simply stop existing in checked
          regions. The accuracy deal is explicit: the guarantee covers exactly the typed
          surface and stops at every <code>any</code>, cast, FFI boundary, and{' '}
          <code>unsafe</code> block. Types compress intent. That is why typed codebases age
          better under both humans and agents.
        </p>

        <BlogHeading level={2}>Tooling: pick the analysis that matches the question</BlogHeading>
        <p>
          &quot;Static analysis tool&quot; covers products with very different contracts.{' '}
          <BlogLink href="https://eslint.org/">ESLint</BlogLink> matches AST nodes in an
          editor loop. <BlogLink href="https://semgrep.dev/">Semgrep</BlogLink> follows
          modeled taint paths.{' '}
          <BlogLink href="https://clang-analyzer.llvm.org/">Clang Static Analyzer</BlogLink>{' '}
          explores C and C++ program states. <BlogLink href="https://klee-se.org/">KLEE</BlogLink>{' '}
          asks a solver for inputs. Calling all of them &quot;the linter&quot; works fine
          right up to the first security sign-off.
        </p>
        <div className={tableWrap}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Question</th>
                <th className={thClass}>Right machinery</th>
                <th className={thClass}>Expect</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}>Style, syntax, deprecated APIs</td>
                <td className={tdClass}>AST rules (ESLint, Semgrep patterns)</td>
                <td className={tdClass}>Near-exact, near-zero false positives</td>
              </tr>
              <tr>
                <td className={tdClass}>Guard before side effect, cleanup order</td>
                <td className={tdClass}>CFG + dominators</td>
                <td className={tdClass}>Exact for structured flow, blind at callbacks</td>
              </tr>
              <tr>
                <td className={tdClass}>Who can reach this dangerous function</td>
                <td className={tdClass}>Call graph (RTA/VTA)</td>
                <td className={tdClass}>Good for direct + typed dispatch, unknown at reflection</td>
              </tr>
              <tr>
                <td className={tdClass}>SQLi, XSS, command injection</td>
                <td className={tdClass}>Taint with explicit models</td>
                <td className={tdClass}>~90% recall on benchmarks with good models, worse without</td>
              </tr>
              <tr>
                <td className={tdClass}>Crash inputs, assertion violations</td>
                <td className={tdClass}>Symbolic execution (KLEE)</td>
                <td className={tdClass}>Concrete witnesses on bounded code, path explosion beyond</td>
              </tr>
              <tr>
                <td className={tdClass}>Prove absence of runtime errors</td>
                <td className={tdClass}>Abstract interpretation (Astrée)</td>
                <td className={tdClass}>Zero false negatives, expert setup, bounded scope</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Formatters belong in the pipeline, but they make layout decisions, not bug claims.
          SAST is a product category rather than an algorithm, so check what a rule actually
          does: pattern matching, local dataflow, interprocedural summaries, or a
          path-sensitive engine.
        </p>
        <Terminal>{`pnpm lint
pnpm typecheck
semgrep scan --config .semgrep/
cargo clippy --all-targets -- -D warnings`}</Terminal>
        <p>
          Run cheap, deterministic checks first and keep the output machine-readable.{' '}
          <BlogLink href="https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html">
            SARIF 2.1.0
          </BlogLink>{' '}
          standardizes rule IDs, locations, messages, fixes, and result metadata, so CI can
          ingest findings without scraping terminal art. Keep a stable fingerprint too.
          Baselines and incremental scans need identity, not just matching prose.
        </p>

        <BlogHeading level={2}>False positives are usually lost relationships</BlogHeading>
        <p>
          A false positive is rarely the analyzer becoming emotional. It usually merged
          paths too early, combined callers that should stay separate, collapsed heap
          objects, or never understood a guard. The report is spurious in your concrete
          program but perfectly valid in the analyzer&apos;s larger, blurrier program.
        </p>
        <CodeBlock
          code={`const allowedFormats = new Set(["csv", "json"]);

function exportReport(rawFormat: string): void {
  if (!allowedFormats.has(rawFormat)) return;

  const format = rawFormat as "csv" | "json";
  execFile("./export-report", ["--format", format]);
}`}
          language="typescript"
        />
        <p>
          A path-insensitive checker may join the rejected and accepted states and still
          call <code>rawFormat</code> untrusted. A checker without library models may not
          know that <code>Set.has</code> is an allowlist guard. A checker that treats{' '}
          <code>execFile</code> like a shell-string sink may miss the argument boundary.
          Three different missing relationships, three different fixes to the model.
        </p>
        <BlogList variant="unordered">
          <BlogListItem>
            <strong>Path sensitivity:</strong> keep branch predicates long enough to tell
            guarded from unguarded states.
          </BlogListItem>
          <BlogListItem>
            <strong>Context sensitivity:</strong> analyze a helper separately for relevant
            callers instead of joining every argument into one state.
          </BlogListItem>
          <BlogListItem>
            <strong>Heap precision:</strong> distinguish fields, allocation sites, and
            bounded access paths instead of tainting an entire object graph.
          </BlogListItem>
          <BlogListItem>
            <strong>Summaries:</strong> describe how framework and library calls move,
            validate, or consume values.
          </BlogListItem>
        </BlogList>
        <p>
          Baseline existing findings so new debt can fail CI without a heroic cleanup week.
          Suppressions should carry a rule ID, a reason, an owner, and a review condition.
          If the same safe pattern gets suppressed over and over, fix the rule or add a
          tested model. Comments are not a distributed analysis engine.
        </p>
        <CodeBlock
          code={`suppression:
  rule: security/request-data-to-shell
  location: src/export.ts:9
  reason: execFile receives an allowlisted argument vector, not a shell string
  owner: platform-security
  review_when: allowedFormats or process API changes`}
          language="text"
        />
        <blockquote>
          <p>
            Never report &quot;clean&quot; when analysis stopped at an unsupported dynamic
            call or hit a path budget. &quot;No finding&quot; and &quot;not analyzed&quot;
            are different states, and CI and humans deserve to know which one they got.
          </p>
        </blockquote>

        <BlogHeading level={2}>
          Static analysis gives AI agents an external repair signal
        </BlogHeading>
        <p>
          Coding agents are great at producing plausible patches and bad at remembering
          every local policy on every turn. A deterministic analyzer turns the statically
          checkable part of those policies into an external signal. The agent can repair
          against a rule ID, a span, and a path. Against &quot;please improve security
          here&quot; it can only vibe.
        </p>
        <p>
          The research is mixed in exactly the way you would expect, and the pattern is
          informative. In the{' '}
          <BlogLink href="https://arxiv.org/html/2504.06939">FeedbackEval</BlogLink>{' '}
          benchmark, agents repaired 63.6% of issues with mixed feedback but only 49.2% with
          compiler feedback alone, with diminishing gains after two or three iterations. A{' '}
          <BlogLink href="https://arxiv.org/abs/2508.14419">
            Bandit/Pylint feedback loop
          </BlogLink>{' '}
          cut security findings from over 40% of samples down to 13%. And on the dark side,{' '}
          <BlogLink href="https://arxiv.org/html/2506.11022v2">
            one study
          </BlogLink>{' '}
          let a model iteratively refine its own code with no external oracle and measured
          37.6% <em>more</em> critical vulnerabilities after five iterations. Deterministic
          tool feedback helps. Model self-critique can actively make things worse.
        </p>
        <p>
          So the diagnostic itself becomes infrastructure. This is what an agent can
          actually repair against:
        </p>
        <CodeBlock
          code={`{
  "rule_id": "local/no-request-to-shell",
  "file": "src/routes/export.ts",
  "range": { "line": 18, "column": 3 },
  "message": "request data reaches shell execution",
  "precision": "path-sensitive",
  "evidence": {
    "source": "request.query.format",
    "sink": "exec(command)",
    "path": ["format", "command", "exec"],
    "required_barrier": "parseExportFormat"
  },
  "fingerprint": "c9d8f4"
}`}
          language="text"
        />
        <p>
          Rule identity, location, evidence, expected barrier, and a fingerprint for
          baselines. That is a repair object, not a warning. The agent loads the files on
          the path, the local rule documentation, and the relevant tests. It does not need
          the entire SARIF file, half the repository, or a motivational speech from the
          linter.
        </p>
        <CodeBlock
          code={`REPAIR_WITH_STATIC_FEEDBACK(goal, max_iterations = 3):
  history = []

  for iteration in 1..max_iterations:
    report = run_deterministic_checks()
    diagnostics = parse_machine_output(report)

    if diagnostics is empty:
      return success

    cluster = choose_one_actionable_rule_cluster(diagnostics)
    if cluster is none or repeats(cluster, history):
      return blocked_with_evidence

    context = load_files_on_diagnostic_path(cluster)
    apply_scoped_patch(goal, cluster, context)
    run_related_tests()
    history.append(cluster.fingerprints)

  return blocked_with_evidence`}
          language="text"
        />
        <p>
          The stop rules matter. A false positive can make an agent change correct code, add
          a fake sanitizer, or suppress a warning it did not understand. Cap iterations,
          stop on a repeated fingerprint, preserve unrelated test behavior, and route
          unknown analysis states to a human (or a better model).
        </p>
        <blockquote>
          <p>
            Static analysis helps an agent when it reduces ambiguity. A noisy rule with
            confident prose is just another hallucination source, except this one has a CI
            badge.
          </p>
        </blockquote>

        <BlogHeading level={2}>Where to go next</BlogHeading>
        <p>
          The smallest useful analyzer is an AST query with a precise rule and good
          fixtures. Build that before you attempt whole-program alias analysis in a
          weekend.. it will win. When syntax stops being enough, add the next fact layer the
          policy actually needs.
        </p>
        <CodeBlock
          code={`Learning path:
  1. Parse one language and preserve source spans.
  2. Write one AST rule with positive and negative fixtures.
  3. Build CFGs for branches, loops, returns, and exceptions.
  4. Implement reaching definitions with a worklist.
  5. Reuse the engine for liveness and definite assignment.
  6. Build a call graph with RTA; notice where it over-approximates.
  7. Add one explicit source-sink-barrier taint model.
  8. Surface unknown calls and exhausted budgets before going interprocedural.`}
          language="text"
        />
        <p>
          For theory, Anders Møller and Michael Schwartzbach&apos;s free{' '}
          <BlogLink href="https://cs.au.dk/~amoeller/spa/">Static Program Analysis</BlogLink>{' '}
          notes connect lattices, fixed points, pointer analysis, and abstract
          interpretation without requiring you to join a monastery. For implementation, read
          the{' '}
          <BlogLink href="https://clang.llvm.org/docs/DataflowAnalysisIntro.html">
            Clang dataflow guide
          </BlogLink>
          , the{' '}
          <BlogLink href="https://semgrep.dev/docs/writing-rules/overview">
            Semgrep rule docs
          </BlogLink>
          , and the{' '}
          <BlogLink href="https://eslint.org/docs/latest/extend/custom-rules">
            ESLint custom-rule API
          </BlogLink>{' '}
          side by side. They expose three useful levels of the stack.
        </p>
        <p>
          The machinery gets deep fast, but the architecture stays legible: parse code,
          build facts, propagate them under explicit approximations, and report evidence
          with its limits. Once you see that pipeline, a type error, a taint trace, and a
          borrow-checker complaint stop looking like unrelated magic. Same family of
          machines, different questions, different precision budgets.
        </p>
        <p>Off you go!</p>
      </div>
    </>
  );
}
