export type InsightStatus = 'seed' | 'working' | 'solid' | 'superseded';

export type InsightConfidence = 'low' | 'medium' | 'high';

export type InsightSourceKind =
  | 'paper'
  | 'official-doc'
  | 'popular-article'
  | 'hn'
  | 'local-case-study';

export interface InsightSource {
  title: string;
  url: string;
  kind: InsightSourceKind;
  localRef?: string;
  note: string;
}

export interface InsightEvidence {
  claim: string;
  sourceTitles: string[];
  detail: string;
}

export interface InsightQuestion {
  question: string;
  whyItMatters: string;
}

export interface Insight {
  title: string;
  slug: string;
  summary: string;
  conclusion: string;
  status: InsightStatus;
  confidence: InsightConfidence;
  sourceType: 'research' | 'experience' | 'case-study' | 'opinion' | 'mixed';
  publishedAt: string;
  updatedAt?: string;
  topics: string[];
  tags: string[];
  usedInPosts: string[];
  relatedSlugs: string[];
  problem: string;
  whyItMatters: string;
  evidence: InsightEvidence[];
  caveats: string[];
  openQuestions: InsightQuestion[];
  sources: InsightSource[];
}

const insights = [
  {
    title: 'Agents run an orient, retrieve, edit, verify loop',
    slug: 'agents-run-orient-retrieve-edit-verify',
    summary:
      'Most coding-agent failures can be grouped by where the agent loop breaks: orientation, retrieval, editing, or verification.',
    conclusion:
      'A repo is agent-friendly when it makes orientation, retrieval, editing, and verification cheap and explicit.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['ai-agents', 'codebase-structure', 'context-engineering'],
    tags: ['agents', 'workflow', 'repository-design'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'tests-are-context-not-just-verification',
      'agents-md-should-be-an-index',
    ],
    problem:
      'Advice about coding agents often starts with prompts. That hides the real system boundary: the agent must first understand the repo, find the relevant code, edit within local conventions, then prove the result.',
    whyItMatters:
      'If the repo does not support each step, the agent spends tokens reconstructing context or makes confident guesses. The loop gives a practical way to classify failures and design fixes.',
    evidence: [
      {
        claim: 'Real repository tasks require more than isolated code generation.',
        sourceTitles: ['SWE-bench'],
        detail:
          'SWE-bench used 2,294 real GitHub issue/PR tasks. The original best reported Claude 2 + BM25 baseline solved 1.96%, showing that repo-level work is not just function synthesis.',
      },
      {
        claim: 'Large-codebase agent performance depends on the harness around the model.',
        sourceTitles: ['Anthropic large-codebase Claude Code guidance'],
        detail:
          'Anthropic frames large-codebase Claude Code usage around layered context, hooks, skills, plugins, LSP, MCP, and subagents. This maps to orient/retrieve/edit/verify rather than a single prompt.',
      },
      {
        claim:
          'Practitioner workflows repeatedly separate research, planning, implementation, and review.',
        sourceTitles: ['Boris Tane: How I Use Claude Code', 'Jon Atkinson: How I use Claude Code'],
        detail:
          'Both practitioner writeups require up-front codebase reading and written plans before implementation. Atkinson also uses a second agent to critique the plan.',
      },
    ],
    caveats: [
      'This is a synthesized model, not a single benchmark result.',
      'Different tools expose different primitives, so the exact loop implementation varies.',
      'The loop is descriptive, not a guarantee that every failure fits neatly into one bucket.',
    ],
    openQuestions: [
      {
        question: 'Can we measure repo readiness per loop stage?',
        whyItMatters:
          'A useful internal score could track setup success, retrieval precision, edit locality, and verification determinism.',
      },
    ],
    sources: [
      {
        title: 'SWE-bench',
        url: 'https://arxiv.org/abs/2310.06770',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/swe-bench-2310.06770.txt',
        note: 'Original benchmark and baseline difficulty signal.',
      },
      {
        title: 'Anthropic large-codebase Claude Code guidance',
        url: 'https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html',
        note: 'Vendor/practitioner framing of large-codebase harness design.',
      },
      {
        title: 'Boris Tane: How I Use Claude Code',
        url: 'https://boristane.com/blog/how-i-use-claude-code/',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/boris-tane-how-i-use-claude-code.html',
        note: 'Research-first workflow with persistent markdown findings.',
      },
      {
        title: 'Jon Atkinson: How I use Claude Code',
        url: 'https://www.jonatkinson.co.uk/blog/how-i-use-claude-code/',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/jon-atkinson-how-i-use-claude-code.html',
        note: 'Two-agent critique loop and phase-by-phase implementation.',
      },
    ],
  },
  {
    title: 'Recoverable structure beats prompt volume',
    slug: 'recoverable-structure-beats-prompt-volume',
    summary:
      'Agents need task-relevant structure they can find and trust more than they need larger instruction blobs.',
    conclusion:
      'The practical target is not more context. The target is recoverable context: names, symbols, imports, schemas, tests, examples, and checks.',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['ai-agents', 'context-engineering', 'retrieval'],
    tags: ['context', 'retrieval', 'graphs'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'function-sized-chunks-are-not-necessarily-agent-friendly',
      'names-are-semantic-infrastructure',
      'types-and-sdks-compress-intent',
    ],
    problem:
      'Long context and long instruction files can still fail when the relevant code is not identifiable or is drowned in irrelevant material.',
    whyItMatters:
      'This shifts codebase design from prose-heavy documentation toward machine-actionable surfaces that agents and tools can index.',
    evidence: [
      {
        claim: 'Cross-file context materially improves repository completion.',
        sourceTitles: ['CrossCodeEval'],
        detail:
          'StarCoder-15.5B Python exact match improved from 8.82 to 15.72 when retrieved cross-file context was added. GPT-3.5-turbo C# exact match improved from 3.56 to 11.82.',
      },
      {
        claim: 'Graph-guided retrieval outperforms plain text retrieval in repo-level generation.',
        sourceTitles: ['GraphCodeAgent'],
        detail:
          'On DevEval with GPT-4o, GraphCodeAgent scored 58.14 Pass@1 compared with Dense RACG at 40.43, reported as +43.81% relative improvement.',
      },
      {
        claim: 'Instruction files can add cost and noise.',
        sourceTitles: ['Evaluating AGENTS.md'],
        detail:
          'LLM-generated context reduced average resolution rate by 0.5% on SWE-bench Lite and 2% on AgentBench while increasing steps and cost.',
      },
    ],
    caveats: [
      'Recoverable structure does not mean no prose. It means prose should point to executable facts.',
      'The best retrieval shape may differ by language, framework, and task type.',
    ],
    openQuestions: [
      {
        question: 'Which repo maps are most useful in private business code?',
        whyItMatters:
          'Academic benchmarks often focus on open-source repositories and may not capture product-specific domain conventions.',
      },
    ],
    sources: [
      {
        title: 'CrossCodeEval',
        url: 'https://arxiv.org/abs/2310.11248',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/crosscodeeval-2310.11248.txt',
        note: 'Cross-file code completion benchmark.',
      },
      {
        title: 'GraphCodeAgent',
        url: 'https://arxiv.org/abs/2504.10046',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt',
        note: 'Dual graph-guided agent for repo-level code generation.',
      },
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt',
        note: 'Counter-evidence against assuming context files are always helpful.',
      },
    ],
  },
  {
    title: 'Names are semantic infrastructure',
    slug: 'names-are-semantic-infrastructure',
    summary:
      'Identifier names are not just human style. They are retrieval handles and semantic cues for code models.',
    conclusion:
      'Stable, descriptive, domain-consistent names improve the surfaces agents use to search, rank, and reason. Misleading names are worse than sparse names.',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['codebase-structure', 'naming', 'ai-agents'],
    tags: ['names', 'identifiers', 'semantics'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['recoverable-structure-beats-prompt-volume', 'types-and-sdks-compress-intent'],
    problem:
      'Humans can compensate for inconsistent naming using memory and team context. Agents often treat inconsistent names as distinct concepts or overweight misleading semantic cues.',
    whyItMatters:
      'Naming consistency is one of the cheapest ways to make codebase context easier to retrieve without additional tooling.',
    evidence: [
      {
        claim: 'Identifier-aware models explicitly treat names as useful semantic signals.',
        sourceTitles: ['CodeT5'],
        detail:
          'CodeT5 introduced identifier-aware objectives because developer-assigned identifiers preserve useful semantics in code.',
      },
      {
        claim: 'Name obfuscation can sharply hurt intent summarization.',
        sourceTitles: ['When Names Disappear'],
        detail:
          'GPT-4o ClassEval class summarization dropped from 87.3 to 58.7 after name obfuscation. DeepSeek V3 dropped from 87.7 to 76.7.',
      },
      {
        claim: 'Nonsense or misleading names significantly affect code-analysis tasks.',
        sourceTitles: ['How Does Naming Affect LLMs on Code Analysis Tasks?'],
        detail:
          'The paper reports significant degradation across code search and clone detection variants when developer-defined names are anonymized or changed.',
      },
    ],
    caveats: [
      'Names can create benchmark leakage and memorization shortcuts. Good names help agents, but names alone are not semantic understanding.',
      'Competitive-programming-style code with short generic names may rely more on structure than naming.',
      'Overly verbose names can also hurt local readability if they hide the domain model in long phrases.',
    ],
    openQuestions: [
      {
        question: 'What naming consistency metrics predict agent success?',
        whyItMatters:
          'It may be possible to detect vocabulary drift across code, API schemas, docs, and tests.',
      },
    ],
    sources: [
      {
        title: 'CodeT5',
        url: 'https://arxiv.org/abs/2109.00859',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/codet5-identifier-aware-2109.00859.txt',
        note: 'Identifier-aware code model.',
      },
      {
        title: 'When Names Disappear',
        url: 'https://arxiv.org/abs/2510.03178',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/when-names-disappear-2510.03178.txt',
        note: 'Name-obfuscation evaluation for summarization and execution prediction.',
      },
      {
        title: 'How Does Naming Affect LLMs on Code Analysis Tasks?',
        url: 'https://arxiv.org/abs/2307.12488',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/naming-affects-llms-code-analysis-2307.12488.txt',
        note: 'Naming perturbation study across code analysis tasks.',
      },
    ],
  },
  {
    title: 'Function-sized chunks are not necessarily agent-friendly',
    slug: 'function-sized-chunks-are-not-necessarily-agent-friendly',
    summary:
      'Small functions can be good code, but function-level retrieval chunks underperformed broader or structure-aware chunks in controlled code completion experiments.',
    conclusion:
      'Agents need coherent neighborhoods, not just tiny functions: imports, declarations, callers, callees, types, examples, and tests.',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['retrieval', 'chunking', 'codebase-structure'],
    tags: ['chunking', 'context', 'functions'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'boundaries-beat-modularity-as-a-slogan',
    ],
    problem:
      'A common intuition is that agents like small functions. That may be true for editing locality, but retrieval needs enough surrounding context to understand valid usage.',
    whyItMatters:
      'This prevents a bad simplification of the talk into "split everything into tiny functions." The better rule is to preserve recoverable neighborhoods.',
    evidence: [
      {
        claim: 'Function chunking underperformed declaration, cAST, and sliding window strategies.',
        sourceTitles: ['Chunking for RAG code completion'],
        detail:
          'On CCEval exact match, Function scored 24.21, Declaration 27.71, cAST 28.19, and Sliding Window 28.40.',
      },
      {
        claim: 'Longer cross-file context mattered more than retriever choice in that study.',
        sourceTitles: ['Chunking for RAG code completion'],
        detail:
          'Increasing cross-file context budget from 2,048 to 8,192 tokens improved EM by up to 4.2 percentage points; retriever choice on RepoEval shifted EM by at most 1.11 points.',
      },
      {
        claim: 'Graph traversal helped repo-level generation.',
        sourceTitles: ['GraphCodeAgent'],
        detail:
          'Removing the SSCGTraverse graph traversal tool dropped Pass@1 from 58.14 to 51.83 in the GraphCodeAgent ablation.',
      },
    ],
    caveats: [
      'This does not argue for large functions.',
      'The result is about retrieval chunking, not all dimensions of code maintainability.',
      'The best chunk shape may differ for UI/component code, tests, and configuration.',
    ],
    openQuestions: [
      {
        question: 'What is the best retrieval unit for React feature work?',
        whyItMatters:
          'Component, hook, route, schema, and test files often form the relevant neighborhood in frontend apps.',
      },
    ],
    sources: [
      {
        title: 'Chunking for RAG code completion',
        url: 'https://arxiv.org/abs/2605.04763',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/chunking-rag-code-completion-2605.04763.txt',
        note: 'Controlled study of chunking strategies for retrieval-augmented code completion.',
      },
      {
        title: 'GraphCodeAgent',
        url: 'https://arxiv.org/abs/2504.10046',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt',
        note: 'Ablation evidence for graph traversal.',
      },
    ],
  },
  {
    title: 'Boundaries beat modularity as a slogan',
    slug: 'boundaries-beat-modularity-as-a-slogan',
    summary:
      'The evidence does not justify "more modular code" as a blanket claim. Useful boundaries expose intent, dependencies, and verification points.',
    conclusion:
      'Do not optimize for modularity as an aesthetic. Optimize for boundaries that reduce search and make correctness checkable.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['architecture', 'modularity', 'ai-agents'],
    tags: ['boundaries', 'architecture', 'modularity'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'function-sized-chunks-are-not-necessarily-agent-friendly',
      'executable-architecture-beats-prose',
    ],
    problem:
      'It is tempting to say agents love modular code. Research on modularity and chunking makes that too broad and possibly wrong.',
    whyItMatters:
      'The talk should not accidentally promote micro-module architecture. The defensible claim is about recoverable boundaries, not file count.',
    evidence: [
      {
        claim: 'A modularity score did not clearly predict better LLM code generation.',
        sourceTitles: ['Revisiting Modularity'],
        detail:
          'The paper found no clear positive correlation between modularity and LLM code-generation performance, and sometimes weak negative relationships.',
      },
      {
        claim: 'Function-level chunks underperformed broader chunking strategies.',
        sourceTitles: ['Chunking for RAG code completion'],
        detail:
          'Function chunks were behind declaration, cAST, and sliding-window chunks on CCEval exact match.',
      },
      {
        claim: 'Graph and dependency context are repeatedly useful.',
        sourceTitles: ['GraphCodeAgent', 'RepoGraph'],
        detail:
          'Repo-level systems model imports, call relationships, semantic code graphs, or repository maps rather than treating files as isolated units.',
      },
    ],
    caveats: [
      'Modularity still helps humans and tools when it captures real responsibility boundaries.',
      "The modularity paper's exact setup may not generalize to all modern coding agents.",
      'Bad monoliths and bad microservices both make agents worse.',
    ],
    openQuestions: [
      {
        question: 'What boundary metrics correlate with agent success?',
        whyItMatters:
          'File count is a weak proxy. Dependency direction, public API clarity, and test locality may be better signals.',
      },
    ],
    sources: [
      {
        title: 'Revisiting Modularity',
        url: 'https://arxiv.org/abs/2407.11406',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/revisiting-modularity-codegen-2407.11406.txt',
        note: 'Counter-evidence against modularity as a blanket LLM-performance claim.',
      },
      {
        title: 'Chunking for RAG code completion',
        url: 'https://arxiv.org/abs/2605.04763',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/chunking-rag-code-completion-2605.04763.txt',
        note: 'Retrieval chunking evidence.',
      },
      {
        title: 'RepoGraph',
        url: 'https://arxiv.org/abs/2410.14684',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/repograph-2410.14684.txt',
        note: 'Repository graph for software engineering agents.',
      },
      {
        title: 'GraphCodeAgent',
        url: 'https://arxiv.org/abs/2504.10046',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/graphcodeagent-2504.10046.txt',
        note: 'Graph-guided repo-level code generation.',
      },
    ],
  },
  {
    title: 'Types and generated SDKs compress intent',
    slug: 'types-and-sdks-compress-intent',
    summary:
      'Types, schemas, and generated SDKs reduce the number of valid guesses an agent can make at an API boundary.',
    conclusion:
      'If an API has a contract, generate the contract into code before asking agents to use it.',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['types', 'apis', 'generated-sdks', 'ai-agents'],
    tags: ['types', 'sdk', 'openapi', 'contracts'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'names-are-semantic-infrastructure',
      'recoverable-structure-beats-prompt-volume',
    ],
    problem:
      'Raw API calls hide route, method, request shape, response shape, auth, pagination, and error contracts in strings and conventions.',
    whyItMatters:
      'Agents are prone to plausible but wrong API calls. Generated clients turn contracts into local symbols that can be imported, typechecked, searched, and used in tests.',
    evidence: [
      {
        claim: 'Type context improves repository-level generation.',
        sourceTitles: ['CatCoder'],
        detail:
          'CatCoder improved Java pass@k by up to 17.35% vs RepoCoder; removing type context dropped Java pass@k by up to 11.57%.',
      },
      {
        claim: 'Explicit interfaces materially affect agent success.',
        sourceTitles: ['FeatureBench'],
        detail:
          'Removing interface descriptions dropped pass rates by about 18 percentage points for Gemini-3-Pro-Preview and GPT-5.1-Codex on the Lite set.',
      },
      {
        claim:
          'OpenAPI ecosystem tooling already supports generated clients as a practical pattern.',
        sourceTitles: ['OpenAPI Generator', 'Kiota', 'Orval', 'Speakeasy', 'Stainless'],
        detail:
          'These tools generate clients/models/hooks/server stubs from OpenAPI or equivalent API descriptions. This is practitioner evidence for implementation feasibility, not causal agent evidence.',
      },
    ],
    caveats: [
      'Generated SDKs are only as correct as the underlying schema.',
      'This is partly proxy evidence: papers support type/interface context; SDK generation is the practical mechanism.',
      'Generated code can add noise if agents edit it directly or if output is not checked in/generated consistently.',
    ],
    openQuestions: [
      {
        question: 'Can we measure raw fetch vs generated SDK usage in agent tasks?',
        whyItMatters:
          'This would provide direct evidence for generated SDKs reducing integration bugs.',
      },
    ],
    sources: [
      {
        title: 'CatCoder',
        url: 'https://arxiv.org/abs/2406.03283',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/catcoder-2406.03283.txt',
        note: 'Repo-level generation with code and type context.',
      },
      {
        title: 'FeatureBench',
        url: 'https://arxiv.org/abs/2602.10975',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt',
        note: 'Feature-level agent benchmark with interface ablations.',
      },
      {
        title: 'OpenAPI Generator',
        url: 'https://openapi-generator.tech/',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/openapi-generator.html',
        note: 'OpenAPI-based generation tool.',
      },
      {
        title: 'Kiota',
        url: 'https://learn.microsoft.com/en-us/openapi/kiota/',
        kind: 'official-doc',
        localRef: 'presentations/write-code-ai-agents-love/research/articles/microsoft-kiota.html',
        note: 'Microsoft OpenAPI client generator.',
      },
      {
        title: 'Orval',
        url: 'https://orval.dev/',
        kind: 'official-doc',
        localRef: 'presentations/write-code-ai-agents-love/research/articles/orval-docs.html',
        note: 'TypeScript client/model/hook generation from OpenAPI.',
      },
      {
        title: 'Speakeasy',
        url: 'https://www.speakeasy.com/docs/sdks/create-client-sdks',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/speakeasy-generate-sdks.html',
        note: 'Generated SDK tooling.',
      },
      {
        title: 'Stainless',
        url: 'https://www.stainless.com/docs/sdks/typescript/',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/stainless-typescript-sdk.html',
        note: 'Generated TypeScript SDK tooling.',
      },
    ],
  },
  {
    title: 'Executable architecture beats prose',
    slug: 'executable-architecture-beats-prose',
    summary:
      'Architecture rules that only exist in prose are easy for agents to miss. Rules that fail precisely are repairable.',
    conclusion:
      'Important repo-specific architecture constraints should be encoded as lint/static-analysis checks where possible.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['architecture', 'linting', 'quality-gates', 'ai-agents'],
    tags: ['lint', 'static-analysis', 'polint', 'architecture'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['agents-md-should-be-an-index', 'boundaries-beat-modularity-as-a-slogan'],
    problem:
      'Agents can read instructions, but they still violate local architecture rules when those rules are implicit, stale, or too abstract.',
    whyItMatters:
      'A precise diagnostic is a better agent interface than a vague convention. It gives the agent a concrete failure to repair.',
    evidence: [
      {
        claim: 'Standard tooling supports project-specific executable rules.',
        sourceTitles: [
          'ESLint custom rules',
          'typescript-eslint custom rules',
          'Semgrep',
          'ast-grep',
          'Nx module boundaries',
        ],
        detail:
          'These tools support custom rules, typed rules, pattern rules, autofix, or module-boundary enforcement.',
      },
      {
        claim: 'Local plint usage demonstrates repo-owned architecture policy as code.',
        sourceTitles: ['polint README', 'polint/plint case study'],
        detail:
          'The local plint repo wires 17 polint rules for backend architecture guardrails: layer imports, route security, context propagation, typed errors, UUID boundaries, repository placement, and test evidence.',
      },
      {
        claim: 'Instruction files can become costly and weak when they carry too much policy.',
        sourceTitles: ['Evaluating AGENTS.md'],
        detail:
          'The AGENTS.md evaluation found context files increased steps and costs, and LLM-generated context had marginal negative success effects.',
      },
    ],
    caveats: [
      'There is not yet a clean causal paper showing custom lint rules improve agent success by X%.',
      'Lint rules can become noisy if they are not maintained or if adoption lacks baselines.',
      'Not every rule deserves code. Use standard linters first and custom rules for important repo-specific constraints.',
    ],
    openQuestions: [
      {
        question: 'Which architecture rules give the highest agent ROI?',
        whyItMatters:
          'Import boundaries, generated-code bans, raw API call bans, and security middleware checks are likely candidates.',
      },
    ],
    sources: [
      {
        title: 'ESLint custom rules',
        url: 'https://eslint.org/docs/latest/extend/custom-rules',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/eslint-custom-rules.html',
        note: 'Custom JavaScript/TypeScript lint rule mechanism.',
      },
      {
        title: 'typescript-eslint custom rules',
        url: 'https://typescript-eslint.io/developers/custom-rules/',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/typescript-eslint-custom-rules.html',
        note: 'Type-aware lint rule support.',
      },
      {
        title: 'Semgrep',
        url: 'https://semgrep.dev/docs/writing-rules/overview/',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/semgrep-custom-guardrails.html',
        note: 'Custom guardrails and pattern-based rules.',
      },
      {
        title: 'ast-grep',
        url: 'https://ast-grep.github.io/guide/rule-config.html',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/ast-grep-lint-rule.html',
        note: 'AST-pattern linting and rewriting.',
      },
      {
        title: 'Nx module boundaries',
        url: 'https://nx.dev/features/enforce-module-boundaries',
        kind: 'official-doc',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/nx-enforce-module-boundaries.html',
        note: 'Monorepo dependency boundary enforcement.',
      },
      {
        title: 'polint README',
        url: 'https://github.com/emilwareus/polint',
        kind: 'local-case-study',
        localRef: 'presentations/write-code-ai-agents-love/research/articles/polint-readme.md',
        note: 'Bring-your-own-rule-code scanning framework.',
      },
      {
        title: 'polint/plint case study',
        url: 'https://github.com/emilwareus/polint',
        kind: 'local-case-study',
        localRef:
          'presentations/write-code-ai-agents-love/research/notes/polint-plint-case-study.md',
        note: 'Local notes on actual plint usage.',
      },
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt',
        note: 'Instruction-file cost caveat.',
      },
    ],
  },
  {
    title: 'AGENTS.md should be an index, not a novel',
    slug: 'agents-md-should-be-an-index',
    summary:
      'Persistent agent instructions help when they point at executable facts. They hurt when they become stale, long, conflicting, or aspirational.',
    conclusion:
      'Use AGENTS.md as a compact operating index: commands, boundaries, generated-code policy, and links to deeper executable docs.',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['agent-instructions', 'context-engineering', 'ai-agents'],
    tags: ['agents-md', 'instructions', 'context'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'executable-architecture-beats-prose',
    ],
    problem:
      'Teams respond to agent mistakes by adding more prose. That can reduce repeated mistakes, but it also increases context load and stale-instruction risk.',
    whyItMatters:
      'The instruction file is now part of the agent interface. It must be maintained like configuration, not treated like a dumping ground.',
    evidence: [
      {
        claim: 'AGENTS.md has measurable but mixed effects.',
        sourceTitles: ['AGENTS.md impact', 'Evaluating AGENTS.md'],
        detail:
          'One study found AGENTS.md reduced median runtime/output tokens. A later evaluation found context files increased steps and cost, with LLM-generated context reducing average resolution rate.',
      },
      {
        claim: 'Popular guidance converges on concise, scoped, current instructions.',
        sourceTitles: [
          'Builder.io AGENTS.md',
          'AI Hackers AGENTS.md guide',
          'Anthropic large-codebase Claude Code guidance',
        ],
        detail:
          'Practitioner sources recommend commands, guardrails, project structure hints, layered context files, hooks, and progressive disclosure instead of giant manuals.',
      },
      {
        claim: 'HN history shows AGENTS.md became a visible community convention.',
        sourceTitles: ['HN search: AGENTS.md threads'],
        detail:
          'Saved HN search showed high-engagement AGENTS.md threads, including an August 2025 open-format thread at 837 points / 382 comments and later threads debating evals and file length.',
      },
    ],
    caveats: [
      'Tool behavior differs. CLAUDE.md, AGENTS.md, Cursor rules, and Copilot instructions are not identical.',
      'A good instruction file cannot compensate for broken setup, missing tests, or unclear APIs.',
      'Instruction-file effects may depend heavily on repo size and task type.',
    ],
    openQuestions: [
      {
        question: 'What is the optimal instruction-file length?',
        whyItMatters:
          'Need repo-specific guidance before turning "keep it short" into a hard line limit.',
      },
    ],
    sources: [
      {
        title: 'AGENTS.md impact',
        url: 'https://arxiv.org/abs/2601.20404',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/agents-md-impact-2601.20404.txt',
        note: 'Positive instruction-file efficiency result.',
      },
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/evaluating-agents-md-2602.11988.txt',
        note: 'Counter-evidence and cost analysis.',
      },
      {
        title: 'Builder.io AGENTS.md',
        url: 'https://www.builder.io/blog/agents-md',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/builder-agents-md.html',
        note: 'Popular guide for AGENTS.md structure.',
      },
      {
        title: 'AI Hackers AGENTS.md guide',
        url: 'https://aihackers.net/posts/agents-md-practical-guide/',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/aihackers-agents-md-practical-guide.html',
        note: 'Practical synthesis of concise rules and progressive disclosure.',
      },
      {
        title: 'Anthropic large-codebase Claude Code guidance',
        url: 'https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/anthropic-large-codebases-claude-code.html',
        note: 'Layered context and harness guidance.',
      },
      {
        title: 'HN search: AGENTS.md threads',
        url: 'https://hn.algolia.com/?q=AGENTS.md',
        kind: 'hn',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/hn-search-agents-md.json',
        note: 'HN popularity/history snapshot.',
      },
    ],
  },
  {
    title: 'Tests are context, not just verification',
    slug: 'tests-are-context-not-just-verification',
    summary:
      'Durable repo tests teach agents expected behavior and setup. Agent-written tests are often temporary probes and should not be equated with quality.',
    conclusion:
      'Invest in clear existing tests, targeted commands, and visible task contracts. Do not blindly optimize for agents writing more tests.',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['testing', 'verification', 'ai-agents'],
    tags: ['tests', 'verification', 'feedback'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['agents-run-orient-retrieve-edit-verify', 'types-and-sdks-compress-intent'],
    problem:
      'Agent workflows often say "write tests" as a blanket rule. Research suggests the value depends on whether tests are durable behavior contracts or temporary observation probes.',
    whyItMatters:
      'Testing budget can improve correctness or waste tokens. The repo should make useful tests easy and cheap to run.',
    evidence: [
      {
        claim: 'Agent-written test frequency does not strongly explain success.',
        sourceTitles: ['Rethinking agent-generated tests'],
        detail:
          'GPT-5.2 wrote tests in only 0.6% of tasks while resolving 71.8%. Claude Opus 4.5 wrote tests in 83.0% of tasks while resolving 74.4%.',
      },
      {
        claim: 'Encouraging more tests can add cost without improving resolution.',
        sourceTitles: ['Rethinking agent-generated tests'],
        detail:
          'Encouraging GPT-5.2 to write tests kept resolution at 71.8% but increased API calls by 5.5%, input tokens by 9.0%, and output tokens by 19.8%.',
      },
      {
        claim: 'Visible real tests can strongly improve feature-task success.',
        sourceTitles: ['FeatureBench'],
        detail:
          'Visible unit tests improved resolved rate by +50.0 percentage points for Gemini-3-Pro-Preview and +43.3 points for GPT-5.1-Codex on the FeatureBench Lite set.',
      },
    ],
    caveats: [
      'The "agent-written tests" study is about a specific high-autonomy setting and Python/SWE-bench-style tasks.',
      'Visible tests can leak target behavior; this is good for development workflow but must be interpreted carefully in benchmark design.',
      'Flaky tests and slow tests can make agents worse by producing misleading feedback.',
    ],
    openQuestions: [
      {
        question: 'What is the smallest useful test slice per feature area?',
        whyItMatters:
          'Agents need fast checks. Full-suite runs are often too slow for every iteration.',
      },
    ],
    sources: [
      {
        title: 'Rethinking agent-generated tests',
        url: 'https://arxiv.org/abs/2602.07900',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/rethinking-agent-generated-tests-2602.07900.txt',
        note: 'Evidence that simply increasing agent-written tests is a weak lever.',
      },
      {
        title: 'FeatureBench',
        url: 'https://arxiv.org/abs/2602.10975',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/featurebench-2602.10975.txt',
        note: 'Visible unit test ablation.',
      },
    ],
  },
  {
    title: 'The monorepo is a context database, if it has boundaries',
    slug: 'monorepo-is-context-database-if-it-has-boundaries',
    summary:
      'Putting app code, docs, infra, schemas, SDKs, tests, and runbooks together gives agents atomic context. Without boundaries and tooling, it just makes a larger mess.',
    conclusion:
      'For agents, the monorepo value is one commit containing the whole truth. The requirement is boundary tooling, not just one repository.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['monorepos', 'context-engineering', 'architecture'],
    tags: ['monorepo', 'docs-as-code', 'infra-as-code'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'executable-architecture-beats-prose',
    ],
    problem:
      'Agents often need to change app code, API contracts, generated clients, infra, migrations, docs, and tests together. Multi-repo splits can hide part of the truth.',
    whyItMatters:
      'A monorepo can reduce cross-system coordination for agents, but only if dependency boundaries, ownership, and build/test tooling are explicit.',
    evidence: [
      {
        claim: 'Large monorepos can act as a common source of truth, but require tooling.',
        sourceTitles: ['Google monorepo paper'],
        detail:
          'The Google paper frames the monorepo as enabled by specialized tooling, workflow, ownership, and build infrastructure.',
      },
      {
        claim: 'Practitioner monorepo writing emphasizes atomic commits and one-version rules.',
        sourceTitles: ['Code Simplicity monorepo article'],
        detail:
          'The article separates monorepo benefits into atomic commits, universal hierarchy, one-version rule, and tooling concerns.',
      },
      {
        claim: 'Local plint uses the pattern for app/backend/SDK/docs/infra context.',
        sourceTitles: ['polint/plint case study'],
        detail:
          'The local plint notes describe a monorepo containing apps, packages, backend, SDKs, IaC, docs, generated OpenAPI artifacts, and repo-local lint policy.',
      },
    ],
    caveats: [
      'There is not direct causal evidence that monorepos improve coding-agent success.',
      'Bad monorepos can be worse for agents because they increase search space and build cost.',
      'Access control and generated-code policy matter more in monorepos.',
    ],
    openQuestions: [
      {
        question: 'Which cross-repo boundaries most often cause agent failure?',
        whyItMatters:
          'This would distinguish where monorepo context is critical from where a multi-repo setup is fine.',
      },
    ],
    sources: [
      {
        title: 'Google monorepo paper',
        url: 'https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/',
        kind: 'paper',
        localRef: 'presentations/write-code-ai-agents-love/research/articles/google-monorepo.html',
        note: 'Large monorepo source-of-truth and tooling discussion.',
      },
      {
        title: 'Code Simplicity monorepo article',
        url: 'https://www.codesimplicity.com/post/what-is-a-monorepo-really/',
        kind: 'popular-article',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/code-simplicity-monorepo.html',
        note: 'Practitioner framing of monorepo properties.',
      },
      {
        title: 'polint/plint case study',
        url: 'https://github.com/emilwareus/polint',
        kind: 'local-case-study',
        localRef:
          'presentations/write-code-ai-agents-love/research/notes/polint-plint-case-study.md',
        note: 'Local monorepo + generated SDK + lint-policy case study.',
      },
    ],
  },
] as const satisfies readonly Insight[];

export type InsightSlug = (typeof insights)[number]['slug'];

export type PublishedInsight = (typeof insights)[number];

export function getAllInsights(): PublishedInsight[] {
  return [...insights].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getInsightBySlug(slug: string): PublishedInsight | null {
  return insights.find((insight) => insight.slug === slug) ?? null;
}

export function getAllInsightSlugs(): InsightSlug[] {
  return insights.map((insight) => insight.slug);
}

export function getRelatedInsights(insight: PublishedInsight): PublishedInsight[] {
  return insight.relatedSlugs.map((slug) => {
    const relatedInsight = getInsightBySlug(slug);

    if (!relatedInsight) {
      throw new Error(`Unknown related insight slug: ${slug}`);
    }

    return relatedInsight;
  });
}

export function getAllInsightTopics(): string[] {
  return Array.from(new Set(insights.flatMap((insight) => insight.topics))).sort();
}
