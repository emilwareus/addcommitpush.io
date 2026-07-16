import {
  BlogHeading,
  BlogLink,
  BlogList,
  BlogListItem,
  Callout,
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
        <p>
          The null dereference was obvious after production found it. The command injection was
          obvious after the incident review. Before that, both were ordinary lines in a pull
          request, surrounded by enough correct code to make human pattern matching give up and go
          for coffee.
        </p>

        <p>
          Static analysis turns those lines into questions a machine can answer without executing
          the program under inspection. The interesting part isn&apos;t the warning. It&apos;s the
          machinery that converts source text into a graph, moves facts across that graph, and
          decides how much uncertainty we can afford before CI becomes a very expensive random
          number generator.
        </p>

        <BlogHeading level={2}>Key takeaways</BlogHeading>

        <BlogList variant="unordered">
          <BlogListItem>
            An analyzer usually lowers source code through syntax trees and an intermediate
            representation before it asks semantic questions.
          </BlogListItem>
          <BlogListItem>
            Control-flow graphs supply the possible execution order; dataflow solvers propagate
            facts until those facts reach a fixed point.
          </BlogListItem>
          <BlogListItem>
            Soundness, precision, and cost pull in different directions. Every useful tool chooses a
            position, whether its marketing page admits it or not.
          </BlogListItem>
          <BlogListItem>
            Taint analysis depends on a good source, sink, sanitizer, and library model. The graph
            search is often the less embarrassing part.
          </BlogListItem>
          <BlogListItem>
            Deterministic, structured diagnostics give humans and coding agents a bounded repair
            loop. Vague warnings give both of us an opportunity to improvise badly.
          </BlogListItem>
        </BlogList>

        <BlogHeading level={2}>What is static analysis?</BlogHeading>

        <p>
          Static analysis reasons about program properties without running the program being
          analyzed. A rule may inspect syntax, prove a type relation, approximate every path through
          a function, or search for a source-to-sink flow. Those are different analyses, but they
          share a contract: derive facts from code and configuration, then report what follows from
          the model.
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
          The analyzer didn&apos;t need a request that happens to omit the session. The type
          <code>Session | undefined</code> describes both states, and the property access is invalid
          in one of them. That small proof is static analysis in its most familiar form.
        </p>

        <Callout variant="tip" title="Key insight">
          <p>
            &quot;Static&quot; describes the evidence, not the implementation. The analyzer runs
            plenty of code. It simply doesn&apos;t use concrete executions of the target program as
            its source of truth.
          </p>
        </Callout>

        <BlogHeading level={2}>The pipeline: source code to analysis facts</BlogHeading>

        <p>
          An analyzer can&apos;t do much with a UTF-8 byte at offset 418. It first lexes characters
          into tokens, parses those tokens into a syntax tree, resolves names and types, then often
          lowers the result into an intermediate representation, or IR. Each stage removes syntax
          trivia and adds facts that later stages would otherwise have to rediscover.
        </p>

        <CodeBlock code={`const retryDelay = baseDelay * 2;`} language="typescript" />

        <p>
          A <BlogLink href="https://tree-sitter.github.io/tree-sitter/">Tree-sitter</BlogLink>{' '}
          concrete syntax tree for that line has roughly this shape. Tree-sitter keeps punctuation
          and source positions because editors need them; a compiler AST usually drops more of that
          surface detail.
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
          The next lowering pass might resolve <code>baseDelay</code> to symbol 27, attach the
          <code>number</code> type, and emit three-address IR. Analyses now see explicit operations
          instead of every legal spelling of a TypeScript expression.
        </p>

        <CodeBlock
          code={`t0 = load symbol#27        // baseDelay: number
t1 = multiply t0, 2
store symbol#31, t1       // retryDelay: number`}
          language="text"
        />

        <blockquote>
          <p>
            Parsing decides what the code says. Lowering decides which differences still matter to
            the analysis.
          </p>
        </blockquote>

        <p>
          That second decision is where analyzer design starts. Desugaring an optional chain into
          branches helps control-flow analysis. Erasing field identity makes heap analysis cheaper,
          but later taint results noisier. There is no neutral IR.
        </p>

        <BlogHeading level={2}>Control-flow graphs make execution order explicit</BlogHeading>

        <p>
          A control-flow graph, or CFG, contains basic blocks connected by possible transfers of
          control. A basic block has one entry and one exit; branches end blocks, targets begin
          them, and loops add edges back to earlier blocks. Dataflow analyses trust these edges, so
          forgetting an exception, <code>finally</code>, callback, or short-circuit edge poisons
          everything downstream with impressive efficiency.
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
          Dominators are the first graph relation worth keeping in your pocket. Block A dominates
          block B when every path from entry to B passes through A. Compilers use the dominator tree
          to build SSA; policy analyzers use the same relation to prove that an authorization guard
          runs before a side effect.
        </p>

        <CodeBlock
          code={`// The guard dominates issueRefund(). Removing the early return breaks that fact.
function refund(order: Order, actor: User): void {
  if (!actor.permissions.includes("refund")) return;

  issueRefund(order.paymentId);
}`}
          language="typescript"
        />

        <Callout variant="warning" title="Pitfall">
          <p>
            A perfect solver over a wrong CFG produces a perfectly stable wrong answer. Test CFG
            construction for early returns, exceptions, cleanup blocks, async callbacks, and the
            framework entrypoints your repository actually uses.
          </p>
        </Callout>

        <BlogHeading level={2}>Dataflow analysis is a fixed-point computation</BlogHeading>

        <p>
          Dataflow analysis attaches a fact to each program point. Reaching definitions asks which
          assignments may reach a use. Live-variable analysis asks which values may be read later.
          Definite assignment asks what must have happened on every incoming path. Different
          question, same engine.
        </p>

        <BlogHeading level={3}>Lattices tell the engine how facts combine</BlogHeading>

        <p>
          A lattice is the set of abstract states plus an ordering and a join operation. For
          reaching definitions, a state is a set of assignment IDs, the order is set inclusion,
          <code>bottom</code> is the empty set, and join is union. Transfer functions describe how
          one instruction changes that set.
        </p>

        <CodeBlock
          code={`node: retries = retries + 1

GEN[node]  = { definition_of_retries_at_node }
KILL[node] = { every_other_definition_of_retries }

OUT[node] = GEN[node] union (IN[node] - KILL[node])`}
          language="text"
        />

        <BlogHeading level={3}>The worklist keeps iterating until nothing changes</BlogHeading>

        <p>
          Loops make the equations recursive. The standard solver puts blocks on a worklist, applies
          their transfer functions, and requeues successors when an output changes. A finite-height
          lattice plus monotone transfer functions guarantees termination because a block&apos;s
          state can only move upward finitely many times.
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
          The result is a fixed point: applying every transfer function again changes nothing.
          Reverse postorder often reaches it with fewer visits, but ordering changes runtime, not
          meaning. The{' '}
          <BlogLink href="https://clang.llvm.org/docs/DataFlowAnalysisIntro.html">
            Clang dataflow guide
          </BlogLink>{' '}
          walks through this same equation with value sets and <code>top</code>/<code>bottom</code>
          states.
        </p>

        <BlogHeading level={3}>May and must analyses answer different questions</BlogHeading>

        <div className="not-prose my-10 overflow-x-auto rounded-lg border border-border p-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left font-semibold">Property</th>
                <th className="p-3 text-left font-semibold">May analysis</th>
                <th className="p-3 text-left font-semibold">Must analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3">Question</td>
                <td className="p-3 text-muted-foreground">True on at least one path?</td>
                <td className="p-3 text-muted-foreground">True on every path?</td>
              </tr>
              <tr>
                <td className="p-3">Typical confluence</td>
                <td className="p-3 font-mono text-xs">union</td>
                <td className="p-3 font-mono text-xs">intersection</td>
              </tr>
              <tr>
                <td className="p-3">Example</td>
                <td className="p-3 text-muted-foreground">reaching definitions, liveness</td>
                <td className="p-3 text-muted-foreground">
                  definite assignment, available expressions
                </td>
              </tr>
              <tr>
                <td className="p-3">Failure bias</td>
                <td className="p-3 text-muted-foreground">extra possibilities create noise</td>
                <td className="p-3 text-muted-foreground">
                  lost proof blocks an optimization or check
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <BlogHeading level={3}>A live-variable analysis by hand</BlogHeading>

        <p>
          Liveness runs backward. A variable is live before a statement when some later path reads
          its current value before overwriting it. The transfer equation is
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
          Across functions, the engine also needs call edges and summaries. Dynamic dispatch,
          reflection, callbacks, and aliases turn the call graph into another precision budget. A
          dataflow solver can compute the exact fixed point of its graph and still be wrong about
          the program if that graph contains fantasy edges or misses real ones.
        </p>

        <BlogHeading level={2}>
          Abstract interpretation trades concrete states for useful ones
        </BlogHeading>

        <p>
          Concrete execution tracks one value, such as <code>attempts = 4</code>. Abstract
          interpretation tracks a property of many values, such as
          <code>attempts in [0, 8]</code>. The analyzer runs abstract versions of addition,
          comparison, assignment, and join over that smaller domain.
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
          Infinite ascending chains need widening. Instead of enumerating
          <code>[0, 0], [0, 1], [0, 2]</code> forever, the analyzer jumps to a coarser bound that
          must stabilize, then may run a bounded narrowing pass to recover precision. Widening is a
          semantic choice, not just an optimization; it changes which alarms appear.
        </p>

        <BlogHeading level={3}>Galois connections without the ceremonial robes</BlogHeading>

        <p>
          An abstraction function <code>alpha</code> maps concrete sets to abstract values.
          Concretization <code>gamma</code> maps an abstract value back to every concrete state it
          represents. A Galois connection says those maps agree about what is safely represented,
          which lets us prove that abstract transfer functions cover their concrete counterparts.
        </p>

        <CodeBlock
          code={`Concrete states C = {0, 1, 2, 3, 4}

alpha(C)       = Interval(0, 4)
gamma([0, 4])  = {0, 1, 2, 3, 4}

Soundness obligation for a concrete step F and abstract step F#:
alpha(F(C)) <= F#(alpha(C))`}
          language="text"
        />

        <BlogHeading level={3}>Soundness, completeness, and cost</BlogHeading>

        <div className="not-prose my-10 overflow-x-auto rounded-lg border border-border p-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left font-semibold">Goal</th>
                <th className="p-3 text-left font-semibold">What it buys</th>
                <th className="p-3 text-left font-semibold">What usually gives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3">Soundness</td>
                <td className="p-3 text-muted-foreground">No missed behavior within the model</td>
                <td className="p-3 text-muted-foreground">More conservative states and alarms</td>
              </tr>
              <tr>
                <td className="p-3">Completeness</td>
                <td className="p-3 text-muted-foreground">
                  Every report corresponds to real behavior
                </td>
                <td className="p-3 text-muted-foreground">
                  Coverage, supported language, or termination
                </td>
              </tr>
              <tr>
                <td className="p-3">Low cost</td>
                <td className="p-3 text-muted-foreground">Fast editor and CI feedback</td>
                <td className="p-3 text-muted-foreground">
                  Path, context, heap, or numeric precision
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          For arbitrary programs and nontrivial semantic properties, a terminating analyzer cannot
          be both sound and complete. That&apos;s the halting problem wearing a linter badge.
          Restricted languages and properties can do better, so always read a soundness claim with
          its model and assumptions attached.
        </p>

        <p>
          Rust&apos;s borrow checker soundly enforces ownership and borrowing rules for safe Rust,
          while <code>unsafe</code> code carries obligations the checker cannot prove.{' '}
          <BlogLink href="https://www.absint.com/astree/index.htm">Astrée</BlogLink> uses abstract
          interpretation to prove the absence of specified runtime errors in safety-critical C under
          an explicit target and environment model. Neither claim means &quot;all possible bugs in
          all programs.&quot;
        </p>

        <Callout variant="tip" title="Key insight">
          <p>
            Ask what a tool over-approximates, what it ignores, and what forces it to widen. The
            word &quot;sound&quot; without those boundaries is decorative.
          </p>
        </Callout>

        <BlogHeading level={2}>Taint analysis is modeling, not magic</BlogHeading>

        <p>
          Taint analysis marks values from sources, propagates labels through assignments and calls,
          removes specific labels at sanitizers or barriers, and reports when forbidden labels reach
          sinks. The lattice is usually a map from program places to sets of taint labels, joined
          with union because one unsafe path is enough.
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
          <BlogLink href="https://semgrep.dev/docs/writing-rules/data-flow/taint-mode/overview">
            Semgrep taint rule
          </BlogLink>
          . The source is request data, the sink is shell execution, the sanitizer names a local
          parsing contract, and the propagator teaches the engine that mutating a collection
          transfers influence. Default assignment flow alone cannot infer every builder, callback,
          ORM, or container API your codebase invented on a Thursday.
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
          Sanitizers are sink-specific. HTML escaping does not make a value safe for SQL, and SQL
          parameterization does not create a shell argument allowlist. Field sensitivity, aliasing,
          access-path depth, implicit flows, and unknown callees decide whether the engine tracks
          the actual value or a vaguely related object.
        </p>

        <Callout variant="warning" title="Pitfall">
          <p>
            Treating an unmodeled call as &quot;no flow&quot; is false confidence. A serious
            analyzer propagates conservatively, applies a configured summary, or emits an explicit
            unknown result. Silence is not evidence of sanitization.
          </p>
        </Callout>

        <BlogHeading level={2}>Symbolic execution keeps paths separate</BlogHeading>

        <p>
          Abstract interpretation usually merges states at joins. Symbolic execution instead gives
          inputs symbols, forks at branches, and records a path constraint for each state. An SMT
          solver checks whether the constraint is satisfiable and, when it is, returns a concrete
          input that drives the program down that path.
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
          <BlogLink href="https://klee-se.org/docs/">KLEE</BlogLink> executes LLVM bitcode this way.
          It can turn a satisfiable path ending in an assertion failure or out-of-bounds access into
          a regression-test input. That concrete witness is where symbolic execution can beat a
          coarser analysis that merged the relevant relation into <code>unknown</code>.
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
          The bill arrives as path explosion. Each independent branch can double the state count;
          loops, recursion, symbolic memory, syscalls, hashes, and nonlinear arithmetic make solving
          worse. Concolic testing runs one concrete execution while collecting symbolic constraints,
          then negates selected branches to find new inputs. It covers useful paths without
          pretending it exhausted the program.
        </p>

        <BlogHeading level={2}>Type systems are the static analyzer you already use</BlogHeading>

        <p>
          A type checker maps runtime values into a smaller domain of types and proves that
          operations respect the language&apos;s rules. Hindley-Milner inference assigns fresh type
          variables, collects constraints from applications, unifies those constraints, and
          generalizes eligible variables at <code>let</code> bindings. You get polymorphism without
          writing a type on every local.
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
          Gradual typing deliberately mixes checked and less-checked regions. TypeScript&apos;s
          <code>unknown</code> forces narrowing at a boundary; <code>any</code> largely switches the
          checker off for values flowing through it. That can be the right migration trade, but the
          guarantee shrinks exactly where <code>any</code> propagates.
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
          Rust adds ownership to the type discipline. Non-<code>Copy</code> values behave affinely:
          they may be consumed at most once unless code explicitly creates another owned value. The
          compiler turns a possible duplicate use of a capability into a type error.
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
            Rust ownership guide
          </BlogLink>{' '}
          shows the same mechanism with heap-owning strings. The checker prevents use after move
          before a test has a chance to get lucky.
        </p>

        <BlogHeading level={2}>Tooling: pick the analysis that matches the question</BlogHeading>

        <p>
          &quot;Static analysis tool&quot; covers products with very different contracts. ESLint can
          match an AST node in an editor loop. Semgrep can follow a modeled taint path. Clang Static
          Analyzer explores C and C++ program states. KLEE asks a solver for inputs. Calling all of
          them &quot;the linter&quot; is convenient right up to the first security sign-off.
        </p>

        <div className="not-prose my-10 overflow-x-auto rounded-lg border border-border p-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left font-semibold">Family</th>
                <th className="p-3 text-left font-semibold">Main evidence</th>
                <th className="p-3 text-left font-semibold">Precision and cost</th>
                <th className="p-3 text-left font-semibold">Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3">Formatter</td>
                <td className="p-3 text-muted-foreground">tokens and layout</td>
                <td className="p-3 text-muted-foreground">deterministic, usually cheapest</td>
                <td className="p-3">Prettier, rustfmt</td>
              </tr>
              <tr>
                <td className="p-3">Linter</td>
                <td className="p-3 text-muted-foreground">AST plus local semantic facts</td>
                <td className="p-3 text-muted-foreground">fast; often file or function scoped</td>
                <td className="p-3">ESLint, Clippy, Ruff</td>
              </tr>
              <tr>
                <td className="p-3">Type checker</td>
                <td className="p-3 text-muted-foreground">types, symbols, constraints</td>
                <td className="p-3 text-muted-foreground">high precision inside its type model</td>
                <td className="p-3">TypeScript, rustc, mypy</td>
              </tr>
              <tr>
                <td className="p-3">SAST or query engine</td>
                <td className="p-3 text-muted-foreground">CFG, calls, dataflow, security models</td>
                <td className="p-3 text-muted-foreground">
                  deeper coverage; more modeling and compute
                </td>
                <td className="p-3">Semgrep, CodeQL, SonarQube</td>
              </tr>
              <tr>
                <td className="p-3">Path analyzer</td>
                <td className="p-3 text-muted-foreground">symbolic states and constraints</td>
                <td className="p-3 text-muted-foreground">precise witnesses; path explosion</td>
                <td className="p-3">Clang Static Analyzer, KLEE</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Formatters belong in the pipeline, but they make layout decisions rather than bug claims.
          Linters span syntax-only and typed rules. SAST is a product category, not an algorithm;
          inspect whether a rule uses pattern matching, local dataflow, interprocedural summaries,
          or a path-sensitive engine.
        </p>

        <Terminal>{`pnpm lint
pnpm typecheck
semgrep scan --config .semgrep/
cargo clippy --all-targets -- -D warnings`}</Terminal>

        <p>
          Run cheap, deterministic checks first and preserve machine-readable output.{' '}
          <BlogLink href="https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html">
            SARIF 2.1.0
          </BlogLink>{' '}
          standardizes rule IDs, locations, messages, fixes, and result metadata so CI systems can
          ingest findings without scraping terminal art. Keep a stable fingerprint too; baselines
          and incremental scans need identity, not just matching prose.
        </p>

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

        <p>
          A false positive is rarely the analyzer becoming emotional. It usually merged paths too
          early, combined callers that should stay separate, collapsed heap objects, or failed to
          understand a guard. The report is spurious in the concrete program but valid in the
          analyzer&apos;s larger, blurrier program.
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
          A path-insensitive checker may join the rejected and accepted states and still call
          <code>rawFormat</code> untrusted. A checker without library models may not know that
          <code>Set.has</code> is an allowlist guard. A checker that treats
          <code>execFile</code> like a shell string sink may ignore the argument boundary. Three
          different missing relationships, three different fixes to the model.
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            <strong>Path sensitivity:</strong> retain branch predicates long enough to distinguish
            guarded from unguarded states.
          </BlogListItem>
          <BlogListItem>
            <strong>Context sensitivity:</strong> analyze a helper separately for relevant callers
            instead of joining every argument into one state.
          </BlogListItem>
          <BlogListItem>
            <strong>Heap precision:</strong> distinguish fields, allocation sites, and bounded
            access paths instead of tainting an entire object graph.
          </BlogListItem>
          <BlogListItem>
            <strong>Summaries:</strong> describe how framework and library calls move, validate, or
            consume values.
          </BlogListItem>
        </BlogList>

        <p>
          Baseline existing findings so new debt can fail CI without requiring a heroic cleanup
          week. Suppressions should carry a rule ID, reason, owner, and review condition. If the
          same safe pattern is suppressed repeatedly, fix the rule or add a tested model; comments
          are not a distributed analysis engine.
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

        <Callout variant="warning" title="Pitfall">
          <p>
            Never report &quot;clean&quot; when analysis stopped at an unsupported dynamic call or a
            path budget. &quot;No finding&quot; and &quot;not analyzed&quot; are different states.
            CI and humans deserve to see which one they got.
          </p>
        </Callout>

        <BlogHeading level={2}>
          Static analysis gives AI agents an external repair signal
        </BlogHeading>

        <p>
          Coding agents are good at producing plausible patches and poor at remembering every local
          policy on every turn. A deterministic analyzer converts the statically checkable part of
          those policies into an external signal. The agent can repair against a rule ID, a span,
          and a path; it can only vibe against &quot;please improve security here.&quot;
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
          Structured diagnostics reduce the search space. The agent loads the files on the path, the
          local rule documentation, and the relevant tests. It does not need the entire SARIF file,
          half the repository, or a motivational speech from the linter.
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
          The stop rules matter. A false positive can make an agent change correct code, add a fake
          sanitizer, or suppress the warning without understanding it. Cap iterations, stop on a
          repeated fingerprint, preserve unrelated test behavior, and route unknown analysis states
          to a human or a better model.
        </p>

        <blockquote>
          <p>
            Static analysis helps an agent when it reduces ambiguity. A noisy rule with confident
            prose is just another hallucination source, except this one has a CI badge.
          </p>
        </blockquote>

        <BlogHeading level={2}>Where to go next</BlogHeading>

        <p>
          The smallest useful analyzer is an AST query with a precise rule and good fixtures. Build
          that before attempting whole-program alias analysis in a weekend. When syntax stops being
          enough, add the next fact layer that the policy actually requires.
        </p>

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

        <p>
          For the theory, Anders Møller and Michael Schwartzbach&apos;s free{' '}
          <BlogLink href="https://cs.au.dk/~amoeller/spa/">Static Program Analysis</BlogLink> notes
          connect lattices, fixed points, pointer analysis, and abstract interpretation without
          requiring you to join a monastery. For implementation, read the{' '}
          <BlogLink href="https://clang.llvm.org/docs/DataFlowAnalysisIntro.html">
            Clang dataflow guide
          </BlogLink>
          , the{' '}
          <BlogLink href="https://semgrep.dev/docs/writing-rules/overview/">
            Semgrep rule documentation
          </BlogLink>
          , and the{' '}
          <BlogLink href="https://eslint.org/docs/latest/extend/custom-rules">
            ESLint custom-rule API
          </BlogLink>{' '}
          side by side. They expose three useful levels of the stack.
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            Follow-up: CFG construction, dominators, SSA, and exception edges.
          </BlogListItem>
          <BlogListItem>
            Follow-up: fixed-point solvers, widening, IFDS/IDE, and sparse value flow.
          </BlogListItem>
          <BlogListItem>
            Follow-up: taint models, summaries, aliases, and path evidence that people can repair.
          </BlogListItem>
          <BlogListItem>
            Follow-up: symbolic execution search strategies and solver-friendly constraints.
          </BlogListItem>
          <BlogListItem>
            Follow-up: repo-local static policies as deterministic feedback for coding agents.
          </BlogListItem>
        </BlogList>

        <p>
          The machinery gets deep quickly, but the architecture stays legible: parse code, build
          facts, propagate them under explicit approximations, and report evidence with its limits.
          Once you see that pipeline, a type error, a taint trace, and a borrow-checker complaint
          stop looking like unrelated magic. They are different answers from the same family of
          machines.
        </p>
      </div>
    </>
  );
}
