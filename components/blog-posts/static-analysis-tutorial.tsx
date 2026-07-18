import {
  BlogHeading,
  BlogLink,
  BlogList,
  BlogListItem,
  Terminal,
} from '@/components/custom';
import { CodeBlock } from '@/components/blog-posts/code-block';

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
        <p>Every null dereference is obvious after production finds it. Every command injection is obvious after the incident review. Before that, both are ordinary lines in a pull request, surrounded by enough correct code that human pattern matching gives up and goes for coffee.</p>
        <p>Static analysis turns those lines into questions a machine can answer without running the program. I spent a few years at Debricked building (and selling) tooling in this space, and the machinery was always the interesting part: how source text becomes a graph, how facts move across that graph, and how much uncertainty you can afford before CI turns into a very expensive random number generator.</p>
        <BlogHeading level={2}>Key takeaways</BlogHeading>
        <BlogList variant="unordered">
          <BlogListItem>An analyzer usually lowers source code through syntax trees and an IR before it asks any semantic questions.</BlogListItem>
          <BlogListItem>Control-flow graphs give you the possible execution order. Dataflow solvers push facts along those edges until nothing changes.</BlogListItem>
          <BlogListItem>Soundness, precision, and cost pull in different directions. Every useful tool picks a position, whether the marketing page admits it or not.</BlogListItem>
          <BlogListItem>Taint analysis lives or dies on its source, sink, sanitizer, and library models. The graph search is often the less embarrassing part.</BlogListItem>
          <BlogListItem>Deterministic, structured diagnostics give humans and coding agents a bounded repair loop. Vague warnings give everyone a chance to improvise badly.</BlogListItem>
        </BlogList>
        <BlogHeading level={2}>What is static analysis?</BlogHeading>
        <p>Static analysis reasons about program properties without running the program. One rule might inspect syntax, another proves a type relation, a third approximates every path through a function, a fourth searches for a source-to-sink flow. Different analyses, same contract: derive facts from code and configuration, then report what follows from the model.</p>
        <CodeBlock
          code={`type Session = { userId: string };

function accountPath(session: Session | undefined): string {
  return "/accounts/" + session.userId;
  // Type checker: 'session' is possibly 'undefined'.
}`}
          language="typescript"
        />
        <p>The analyzer never needed a request that forgets the session. The type <code>Session | undefined</code> describes both states at once, and the property access is invalid in one of them. That small proof is static analysis in its most familiar form.</p>
        <blockquote>
          <p>&quot;Static&quot; describes the evidence, not the implementation. The analyzer runs plenty of code. It just never uses concrete executions of your program as its source of truth.</p>
        </blockquote>
        <BlogHeading level={2}>The pipeline: source code to analysis facts</BlogHeading>
        <p>An analyzer can&apos;t do much with a UTF-8 byte at offset 418. So it lexes characters into tokens, parses tokens into a syntax tree, resolves names and types, and then usually lowers the result into an intermediate representation (IR). Each stage drops syntax trivia and adds facts that later stages would otherwise have to rediscover.</p>
        <CodeBlock
          code={`const retryDelay = baseDelay * 2;`}
          language="typescript"
        />
        <p>A Tree-sitter concrete syntax tree for that line looks roughly like this. Tree-sitter keeps punctuation and source positions because editors need them. A compiler AST throws more of that surface detail away.</p>
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
        <p>One more lowering pass and <code>baseDelay</code> becomes symbol 27 with type <code>number</code> attached, and the expression becomes three-address IR. Analyses now see explicit operations instead of every legal spelling of a TypeScript expression.</p>
        <CodeBlock
          code={`t0 = load symbol#27        // baseDelay: number
t1 = multiply t0, 2
store symbol#31, t1       // retryDelay: number`}
          language="text"
        />
        <blockquote>
          <p>Parsing decides what the code says. Lowering decides which differences still matter to the analysis.</p>
        </blockquote>
        <p>That second decision is where analyzer design starts. Desugar an optional chain into branches and control-flow analysis gets easier. Erase field identity and heap analysis gets cheaper, but your taint results get noisier. There is no neutral IR.</p>
        <BlogHeading level={2}>Control-flow graphs make execution order explicit</BlogHeading>
        <p>A control-flow graph (CFG) is basic blocks connected by possible transfers of control. A basic block has one entry and one exit. Branches end blocks, jump targets begin them, loops add edges back to earlier blocks. Every dataflow analysis trusts these edges, so forgetting an exception, a <code>finally</code>, a callback, or a short-circuit edge poisons everything downstream with impressive efficiency.</p>
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
        <p>Dominators are the first graph relation worth keeping in your pocket. Block A dominates block B when every path from entry to B passes through A. Compilers use the dominator tree to build SSA. Policy analyzers use the same relation to prove that an authorization guard runs before a side effect.</p>
        <CodeBlock
          code={`// The guard dominates issueRefund(). Removing the early return breaks that fact.
function refund(order: Order, actor: User): void {
  if (!actor.permissions.includes("refund")) return;

  issueRefund(order.paymentId);
}`}
          language="typescript"
        />
        <blockquote>
          <p>A perfect solver over a wrong CFG produces a perfectly stable wrong answer. Test CFG construction for early returns, exceptions, cleanup blocks, async callbacks, and the framework entrypoints your repository actually uses.</p>
        </blockquote>
        <BlogHeading level={2}>Dataflow analysis is a fixed-point computation</BlogHeading>
        <p>Dataflow analysis attaches a fact to each program point. Reaching definitions asks which assignments may reach a use. Live-variable analysis asks which values may be read later. Definite assignment asks what must have happened on every incoming path. Different questions, same engine.</p>
        <BlogHeading level={3}>Lattices tell the engine how facts combine</BlogHeading>
        <p>A lattice is a set of abstract states plus an ordering and a join operation. For reaching definitions, a state is a set of assignment IDs, the order is set inclusion, <code>bottom</code> is the empty set, and join is union. Transfer functions describe how one instruction changes that set.</p>
        <CodeBlock
          code={`node: retries = retries + 1

GEN[node]  = { definition_of_retries_at_node }
KILL[node] = { every_other_definition_of_retries }

OUT[node] = GEN[node] union (IN[node] - KILL[node])`}
          language="text"
        />
        <BlogHeading level={3}>The worklist keeps iterating until nothing changes</BlogHeading>
        <p>Loops make the equations recursive, so you iterate. The standard solver puts blocks on a worklist, applies their transfer functions, and requeues successors whenever an output changes. A finite-height lattice plus monotone transfer functions guarantees termination, because a block&apos;s state can only move upward finitely many times.</p>
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
        <p>The result is a fixed point: apply every transfer function again and nothing changes. Reverse postorder usually gets there with fewer visits, but ordering changes runtime, never meaning. The <BlogLink href="https://clang.llvm.org/docs/DataflowAnalysisIntro.html">Clang dataflow guide</BlogLink> walks through this same equation with value sets and <code>top</code>/<code>bottom</code> states.</p>
        <BlogHeading level={3}>May and must analyses answer different questions</BlogHeading>
        <p>Reaching definitions is a *may* analysis. A definition reaches a use if it travels along *some* path, so joins take the union and the fact set grows. Over-approximating is what you want for bug finding: a value that maybe reaches a sink is worth a report. Liveness is also a may analysis, just running backward.</p>
        <p>Definite assignment is a *must* analysis. A variable counts as assigned only if it was assigned on *every* incoming path, so joins take the intersection and facts shrink. You reach for must-reasoning when one missing path breaks the conclusion: proving a variable is initialized, proving a lock is held. Same worklist, same fixed point. The join operator decides which question you asked.</p>
        <BlogHeading level={3}>A live-variable analysis by hand</BlogHeading>
        <p>Liveness runs backward. A variable is live before a statement when some later path reads its current value before overwriting it. The transfer equation is <code>IN = USE union (OUT - DEF)</code>.</p>
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
        <p>Across functions the engine also needs call edges and summaries. Dynamic dispatch, reflection, callbacks, and aliases turn the call graph into yet another precision budget. A solver can compute the exact fixed point of its graph and still be wrong about the program, if that graph invents fantasy edges or misses real ones.</p>
        <BlogHeading level={2}>Abstract interpretation trades concrete states for useful ones</BlogHeading>
        <p>Concrete execution tracks one value: <code>attempts = 4</code>. Abstract interpretation tracks a property of many values: <code>attempts in [0, 8]</code>. The analyzer runs abstract versions of addition, comparison, assignment, and join over that smaller domain.</p>
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
        <p>Infinite ascending chains need widening. Instead of enumerating <code>[0, 0], [0, 1], [0, 2]</code> forever, the analyzer jumps to a coarser bound that must stabilize, then may run a bounded narrowing pass to win precision back. Widening is a semantic choice, not just an optimization. It changes which alarms you get.</p>
        <BlogHeading level={3}>Galois connections without the ceremonial robes</BlogHeading>
        <p>An abstraction function <code>alpha</code> maps concrete sets to abstract values. A concretization function <code>gamma</code> maps an abstract value back to every concrete state it stands for. A Galois connection says the two maps agree about what is safely represented, which is what lets us prove that an abstract transfer function covers its concrete counterpart. The names are scarier than the idea.</p>
        <CodeBlock
          code={`Concrete states C = {0, 1, 2, 3, 4}

alpha(C)       = Interval(0, 4)
gamma([0, 4])  = {0, 1, 2, 3, 4}

Soundness obligation for a concrete step F and abstract step F#:
alpha(F(C)) <= F#(alpha(C))`}
          language="text"
        />
        <BlogHeading level={3}>Soundness, completeness, and cost</BlogHeading>
        <p>For arbitrary programs and nontrivial semantic properties, a terminating analyzer cannot be both sound and complete. That is the halting problem wearing a linter badge. Restricted languages and properties can do better, so read every soundness claim with its model and assumptions attached.</p>
        <p>Rust&apos;s borrow checker soundly enforces ownership and borrowing for safe Rust, while <code>unsafe</code> blocks carry obligations the checker cannot prove. <BlogLink href="https://www.absint.com/astree/index.htm">Astrée</BlogLink> uses abstract interpretation to prove the absence of specified runtime errors in safety-critical C, under an explicit target and environment model. Neither claim means &quot;all possible bugs in all programs.&quot;</p>
        <blockquote>
          <p>Ask what a tool over-approximates, what it ignores, and what forces it to widen. The word &quot;sound&quot; without those boundaries is decorative.</p>
        </blockquote>
        <BlogHeading level={2}>Taint analysis is modeling, not magic</BlogHeading>
        <p>Taint analysis marks values from sources, propagates labels through assignments and calls, removes labels at sanitizers or barriers, and reports when a forbidden label reaches a sink. The lattice is usually a map from program points to sets of taint labels, joined with union, because one unsafe path is enough.</p>
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
        <p>That is the shape of a <BlogLink href="https://semgrep.dev/docs/writing-rules/data-flow/taint-mode">Semgrep taint rule</BlogLink>. The source is request data, the sink is shell execution, the sanitizer names a local parsing contract, and the propagator teaches the engine that pushing into a collection transfers influence. Default assignment flow alone will never infer every builder, callback, ORM, or container API your codebase invented on a Thursday.</p>
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
        <p>Sanitizers are sink-specific. HTML escaping does not make a value safe for SQL, and SQL parameterization does not give you a shell argument allowlist. Field sensitivity, aliasing, access-path depth, implicit flows, and unknown callees decide whether the engine tracks the actual value or a vaguely related object.</p>
        <blockquote>
          <p>Treating an unmodeled call as &quot;no flow&quot; is false confidence. A serious analyzer propagates conservatively, applies a configured summary, or emits an explicit unknown result. Silence is not evidence of sanitization.</p>
        </blockquote>
        <BlogHeading level={2}>Symbolic execution keeps paths separate</BlogHeading>
        <p>Abstract interpretation merges states at joins. Symbolic execution does the opposite: inputs become symbols, the engine forks at every branch, and each state carries its own path constraint. An SMT solver checks whether a constraint is satisfiable and, when it is, hands back a concrete input that drives the program down that path.</p>
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
        <p><BlogLink href="https://klee-se.org/">KLEE</BlogLink> executes LLVM bitcode this way. A satisfiable path ending in an assertion failure or an out-of-bounds access becomes a regression-test input. That concrete witness is where symbolic execution beats a coarser analysis that merged the interesting relation into <code>unknown</code>.</p>
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
        <p>The bill arrives as path explosion. Every independent branch can double the state count, and loops, recursion, symbolic memory, syscalls, hashes, and nonlinear arithmetic make solving worse. Concolic testing runs one concrete execution while collecting symbolic constraints, then negates selected branches to find new inputs. It covers useful paths without pretending it exhausted the program.</p>
        <BlogHeading level={2}>Type systems are the static analyzer you already use</BlogHeading>
        <p>A type checker maps runtime values into a smaller domain of types and proves that operations respect the language&apos;s rules. Hindley-Milner inference assigns fresh type variables, collects constraints from applications, unifies them, and generalizes eligible variables at <code>let</code> bindings. You get polymorphism without writing a type on every local.</p>
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
        <p>Gradual typing deliberately mixes checked and less-checked regions. TypeScript&apos;s <code>unknown</code> forces narrowing at a boundary. <code>any</code> mostly switches the checker off for every value flowing through it, which can be the right migration trade. Just remember that the guarantee shrinks exactly where <code>any</code> spreads.</p>
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
        <p>Rust adds ownership to the type discipline. Non-<code>Copy</code> values behave affinely: consume them at most once, unless the code explicitly creates another owned value. A possible double-use of a capability becomes a type error.</p>
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
        <p>The <BlogLink href="https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html">Rust ownership chapter</BlogLink> walks through the same mechanism with heap-owning strings. The checker catches use after move before a test even has the chance to get lucky.</p>
        <BlogHeading level={2}>Tooling: pick the analysis that matches the question</BlogHeading>
        <p>&quot;Static analysis tool&quot; covers products with very different contracts. <BlogLink href="https://eslint.org/">ESLint</BlogLink> matches AST nodes in an editor loop. <BlogLink href="https://semgrep.dev/">Semgrep</BlogLink> follows modeled taint paths. <BlogLink href="https://clang-analyzer.llvm.org/">Clang Static Analyzer</BlogLink> explores C and C++ program states. <BlogLink href="https://klee-se.org/">KLEE</BlogLink> asks a solver for inputs. Calling all of them &quot;the linter&quot; works fine right up to the first security sign-off.</p>
        <p>Formatters belong in the pipeline, but they make layout decisions, not bug claims. Linters span everything from syntax-only to fully typed rules. SAST is a product category rather than an algorithm, so check what a rule actually does: pattern matching, local dataflow, interprocedural summaries, or a path-sensitive engine.</p>
        <Terminal>{`pnpm lint
pnpm typecheck
semgrep scan --config .semgrep/
cargo clippy --all-targets -- -D warnings`}</Terminal>
        <p>Run cheap, deterministic checks first and keep the output machine-readable. <BlogLink href="https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html">SARIF 2.1.0</BlogLink> standardizes rule IDs, locations, messages, fixes, and result metadata, so CI can ingest findings without scraping terminal art. Keep a stable fingerprint too. Baselines and incremental scans need identity, not just matching prose.</p>
        <CodeBlock
          code={`{
  "version": "2.1.0",
  "runs": [{
    "tool": { "driver": { "name": "repo-analyzer" } },
    "results": [{
      "ruleId": "security/request-data-to-shell",
      "level": "error",
      "message": { "text": "Request data reaches exec" },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "src/export.ts" }
        }
      }]
    }]
  }]
}`}
          language="text"
        />
        <BlogHeading level={2}>False positives are usually lost relationships</BlogHeading>
        <p>A false positive is rarely the analyzer becoming emotional. It usually merged paths too early, combined callers that should stay separate, collapsed heap objects, or never understood a guard. The report is spurious in your concrete program but perfectly valid in the analyzer&apos;s larger, blurrier program.</p>
        <CodeBlock
          code={`const allowedFormats = new Set(["csv", "json"]);

function exportReport(rawFormat: string): void {
  if (!allowedFormats.has(rawFormat)) return;

  const format = rawFormat as "csv" | "json";
  execFile("./export-report", ["--format", format]);
}`}
          language="typescript"
        />
        <p>A path-insensitive checker may join the rejected and accepted states and still call <code>rawFormat</code> untrusted. A checker without library models may not know that <code>Set.has</code> is an allowlist guard. A checker that treats <code>execFile</code> like a shell-string sink may miss the argument boundary. Three different missing relationships, three different fixes to the model.</p>
        <BlogList variant="unordered">
          <BlogListItem><strong>Path sensitivity:</strong> keep branch predicates long enough to tell guarded from unguarded states.</BlogListItem>
          <BlogListItem><strong>Context sensitivity:</strong> analyze a helper separately for relevant callers instead of joining every argument into one state.</BlogListItem>
          <BlogListItem><strong>Heap precision:</strong> distinguish fields, allocation sites, and bounded access paths instead of tainting an entire object graph.</BlogListItem>
          <BlogListItem><strong>Summaries:</strong> describe how framework and library calls move, validate, or consume values.</BlogListItem>
        </BlogList>
        <p>Baseline existing findings so new debt can fail CI without a heroic cleanup week. Suppressions should carry a rule ID, a reason, an owner, and a review condition. If the same safe pattern gets suppressed over and over, fix the rule or add a tested model. Comments are not a distributed analysis engine.</p>
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
          <p>Never report &quot;clean&quot; when analysis stopped at an unsupported dynamic call or hit a path budget. &quot;No finding&quot; and &quot;not analyzed&quot; are different states, and CI and humans deserve to know which one they got.</p>
        </blockquote>
        <BlogHeading level={2}>Static analysis gives AI agents an external repair signal</BlogHeading>
        <p>Coding agents are great at producing plausible patches and bad at remembering every local policy on every turn. A deterministic analyzer turns the statically checkable part of those policies into an external signal. The agent can repair against a rule ID, a span, and a path. Against &quot;please improve security here&quot; it can only vibe.</p>
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
        <p>Structured diagnostics shrink the search space. The agent loads the files on the path, the local rule documentation, and the relevant tests. It does not need the entire SARIF file, half the repository, or a motivational speech from the linter.</p>
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
        <p>The stop rules matter. A false positive can make an agent change correct code, add a fake sanitizer, or suppress a warning it did not understand. Cap iterations, stop on a repeated fingerprint, preserve unrelated test behavior, and route unknown analysis states to a human (or a better model).</p>
        <blockquote>
          <p>Static analysis helps an agent when it reduces ambiguity. A noisy rule with confident prose is just another hallucination source, except this one has a CI badge.</p>
        </blockquote>
        <BlogHeading level={2}>Where to go next</BlogHeading>
        <p>The smallest useful analyzer is an AST query with a precise rule and good fixtures. Build that before you attempt whole-program alias analysis in a weekend.. it will win. When syntax stops being enough, add the next fact layer the policy actually needs.</p>
        <CodeBlock
          code={`Learning path:
  1. Parse one language and preserve source spans.
  2. Write one AST rule with positive and negative fixtures.
  3. Build CFGs for branches, loops, returns, and exceptions.
  4. Implement reaching definitions with a worklist.
  5. Reuse the engine for liveness and definite assignment.
  6. Add one explicit source-sink-barrier model.
  7. Surface unknown calls and exhausted budgets before going interprocedural.`}
          language="text"
        />
        <p>For theory, Anders Møller and Michael Schwartzbach&apos;s free <BlogLink href="https://cs.au.dk/~amoeller/spa/">Static Program Analysis</BlogLink> notes connect lattices, fixed points, pointer analysis, and abstract interpretation without requiring you to join a monastery. For implementation, read the <BlogLink href="https://clang.llvm.org/docs/DataflowAnalysisIntro.html">Clang dataflow guide</BlogLink>, the <BlogLink href="https://semgrep.dev/docs/writing-rules/overview">Semgrep rule docs</BlogLink>, and the <BlogLink href="https://eslint.org/docs/latest/extend/custom-rules">ESLint custom-rule API</BlogLink> side by side. They expose three useful levels of the stack.</p>
        <BlogList variant="unordered">
          <BlogListItem>Follow-up: CFG construction, dominators, SSA, and exception edges.</BlogListItem>
          <BlogListItem>Follow-up: fixed-point solvers, widening, IFDS/IDE, and sparse value flow.</BlogListItem>
          <BlogListItem>Follow-up: taint models, summaries, aliases, and path evidence that people can repair.</BlogListItem>
          <BlogListItem>Follow-up: symbolic execution search strategies and solver-friendly constraints.</BlogListItem>
          <BlogListItem>Follow-up: repo-local static policies as deterministic feedback for coding agents.</BlogListItem>
        </BlogList>
        <p>The machinery gets deep fast, but the architecture stays legible: parse code, build facts, propagate them under explicit approximations, and report evidence with its limits. Once you see that pipeline, a type error, a taint trace, and a borrow-checker complaint stop looking like unrelated magic. Same family of machines, different questions.</p>
        <p>Off you go!</p>
      </div>
    </>
  );
}