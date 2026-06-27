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
  sourceTitles: readonly string[];
  detail: string;
}

export interface InsightQuestion {
  question: string;
  whyItMatters: string;
}

export interface InsightQuote {
  text: string;
  sourceTitle: string;
  note: string;
}

export interface InsightSection {
  heading: string;
  body: readonly string[];
  quote?: InsightQuote;
}

export type InsightGraphNodeType = 'insight' | 'blog-post' | 'presentation';

export type InsightGraphRelation =
  | 'builds-on'
  | 'contrasts-with'
  | 'depends-on'
  | 'extends'
  | 'operationalizes'
  | 'packs-into'
  | 'supports';

export type InsightGraphStrength = 1 | 2 | 3;

export interface InsightGraphEdge {
  targetType: InsightGraphNodeType;
  targetSlug: string;
  relation: InsightGraphRelation;
  strength: InsightGraphStrength;
  note: string;
}

export interface InsightGraph {
  edges: readonly InsightGraphEdge[];
}

export interface BrainGraphDocument {
  type: Exclude<InsightGraphNodeType, 'insight'>;
  slug: string;
  title: string;
  status: 'research' | 'draft' | 'published';
  href?: string;
  summary: string;
  topics: readonly string[];
  tags: readonly string[];
}

export interface Insight {
  title: string;
  slug: string;
  summary: string;
  conclusion: string;
  articlePath?: string;
  status: InsightStatus;
  confidence: InsightConfidence;
  sourceType: 'research' | 'experience' | 'case-study' | 'opinion' | 'mixed';
  publishedAt: string;
  updatedAt?: string;
  topics: readonly string[];
  tags: readonly string[];
  usedInPosts: readonly string[];
  relatedSlugs: readonly string[];
  graph: InsightGraph;
  problem: string;
  whyItMatters: string;
  evidence: readonly InsightEvidence[];
  caveats: readonly string[];
  openQuestions: readonly InsightQuestion[];
  sources: readonly InsightSource[];
}

const brainGraphDocuments = [
  {
    type: 'blog-post',
    slug: 'write-code-ai-agents-love',
    title: 'Write code AI agents love',
    status: 'draft',
    summary:
      'The planned article that packages these research notes into a practical argument for senior engineers.',
    topics: ['ai-agents', 'codebase-structure', 'context-engineering'],
    tags: ['draft', 'agents', 'architecture'],
  },
  {
    type: 'presentation',
    slug: 'write-code-ai-agents-love-deck',
    title: 'Write code AI agents love deck',
    status: 'research',
    summary:
      'The talk version of the same argument, with the research compressed into a clearer stage narrative.',
    topics: ['ai-agents', 'presentations', 'codebase-structure'],
    tags: ['talk', 'deck', 'research'],
  },
  {
    type: 'blog-post',
    slug: 'context-engineering-claude-code',
    title: 'Advanced Context Engineering with Claude Code',
    status: 'published',
    href: '/blog/context-engineering-claude-code',
    summary:
      'Earlier published writing about structuring information, commands, agents, and scripts for Claude Code.',
    topics: ['context-engineering', 'ai-agents', 'workflows'],
    tags: ['published', 'claude-code', 'context'],
  },
  {
    type: 'presentation',
    slug: 'voice-agents-deck',
    title: 'Building Real-Time Voice Agents deck',
    status: 'research',
    summary:
      'The voice-agent presentation and Jarvis demo research track covering VAD, STT, TTS, transport, barge-in, and native speech models.',
    topics: ['voice-agents', 'real-time', 'presentations'],
    tags: ['voice-agents', 'deck', 'research'],
  },
  {
    type: 'blog-post',
    slug: 'voice-agents-article-draft',
    title: 'Future voice agents article',
    status: 'research',
    summary:
      'A future article compressing the voice-agent second brain into a practical technical narrative.',
    topics: ['voice-agents', 'stt', 'tts', 'turn-taking', 'webrtc'],
    tags: ['voice-agents', 'draft', 'research'],
  },
] as const satisfies readonly BrainGraphDocument[];

const insights = [
  {
    title: 'Agents run an orient, retrieve, edit, verify loop',
    slug: 'agents-run-orient-retrieve-edit-verify',
    summary:
      'Most coding-agent failures can be grouped by where the agent loop breaks: orientation, retrieval, editing, or verification.',
    conclusion:
      'A repo is agent-friendly when it makes orientation, retrieval, editing, and verification cheap and explicit.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_01_context_maps.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'depends-on',
          strength: 3,
          note: 'Each loop stage needs context the agent can recover without guessing.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tests-are-context-not-just-verification',
          relation: 'depends-on',
          strength: 3,
          note: 'The verify stage becomes useful only when tests are fast, local, and meaningful.',
        },
        {
          targetType: 'insight',
          targetSlug: 'agents-md-should-be-an-index',
          relation: 'operationalizes',
          strength: 2,
          note: 'A compact AGENTS.md can make orientation rules and commands explicit.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is the opening model for the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This becomes the talk frame: orient, retrieve, edit, verify.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'context-engineering-claude-code',
          relation: 'extends',
          strength: 2,
          note: 'It extends the earlier context-engineering workflow into repo structure.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_05_maintainability_beats_one_shot_correctness.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'function-sized-chunks-are-not-necessarily-agent-friendly',
          relation: 'supports',
          strength: 3,
          note: 'Chunking evidence shows why recoverable neighborhoods beat tiny isolated snippets.',
        },
        {
          targetType: 'insight',
          targetSlug: 'names-are-semantic-infrastructure',
          relation: 'supports',
          strength: 3,
          note: 'Names are one of the cheapest recoverable handles in the repository.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'supports',
          strength: 3,
          note: 'Types and generated clients turn hidden API knowledge into searchable local code.',
        },
        {
          targetType: 'insight',
          targetSlug: 'monorepo-is-context-database-if-it-has-boundaries',
          relation: 'extends',
          strength: 2,
          note: 'The monorepo note is the larger repository-scale version of recoverable context.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is one of the article core claims.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This gives the talk a measurable research backbone.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'context-engineering-claude-code',
          relation: 'extends',
          strength: 3,
          note: 'It connects directly to the earlier context-engineering article.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_13_names_are_semantic_infrastructure.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['codebase-structure', 'naming', 'ai-agents'],
    tags: ['names', 'identifiers', 'semantics'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['recoverable-structure-beats-prompt-volume', 'types-and-sdks-compress-intent'],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'supports',
          strength: 3,
          note: 'Consistent names are a primary mechanism for recoverable context.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'supports',
          strength: 3,
          note: 'Generated SDKs amplify naming discipline by turning contracts into symbols.',
        },
        {
          targetType: 'insight',
          targetSlug: 'boundaries-beat-modularity-as-a-slogan',
          relation: 'supports',
          strength: 2,
          note: 'Boundary names define the domain vocabulary agents use to route work.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This becomes the naming section of the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This can become a visual vocabulary-drift example in the talk.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'supports',
          strength: 3,
          note: 'Chunking is the concrete retrieval mechanism behind recoverable structure.',
        },
        {
          targetType: 'insight',
          targetSlug: 'boundaries-beat-modularity-as-a-slogan',
          relation: 'contrasts-with',
          strength: 3,
          note: 'This keeps the boundary argument from collapsing into tiny-function advice.',
        },
        {
          targetType: 'insight',
          targetSlug: 'agents-run-orient-retrieve-edit-verify',
          relation: 'supports',
          strength: 2,
          note: 'Chunk shape mostly affects the retrieve stage of the agent loop.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is the counterintuitive research section for the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This is a strong slide because it challenges simplistic clean-code advice.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_15_modularity_is_not_magic_boundaries_are.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'function-sized-chunks-are-not-necessarily-agent-friendly',
          relation: 'builds-on',
          strength: 3,
          note: 'The chunking evidence explains why boundary quality is not the same as smallness.',
        },
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'operationalizes',
          strength: 3,
          note: 'Boundary rules become agent-friendly when violations fail as diagnostics.',
        },
        {
          targetType: 'insight',
          targetSlug: 'monorepo-is-context-database-if-it-has-boundaries',
          relation: 'supports',
          strength: 2,
          note: 'The monorepo only works if the boundary graph remains understandable.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This keeps the article from making vague modularity claims.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This becomes the architecture nuance section in the talk.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_06_types_and_interfaces_compress_context.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'names-are-semantic-infrastructure',
          relation: 'supports',
          strength: 3,
          note: 'Generated SDKs preserve API vocabulary as local symbols.',
        },
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'supports',
          strength: 3,
          note: 'Types and SDKs are recoverable context at API boundaries.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tests-are-context-not-just-verification',
          relation: 'depends-on',
          strength: 2,
          note: 'Generated clients are strongest when contract tests or typechecks catch drift.',
        },
        {
          targetType: 'insight',
          targetSlug: 'monorepo-is-context-database-if-it-has-boundaries',
          relation: 'supports',
          strength: 2,
          note: 'Monorepos make schema, generator config, client output, and app code visible together.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is one of the author-specific flavor sections in the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This can be shown with raw fetch versus generated client examples.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_18_custom_lint_rules_are_executable_architecture.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['architecture', 'linting', 'quality-gates', 'ai-agents'],
    tags: ['lint', 'static-analysis', 'polint', 'architecture'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'agents-md-should-be-an-index',
      'boundaries-beat-modularity-as-a-slogan',
      'static-diagnostics-are-agent-interfaces',
      'static-oracles-catch-what-tests-miss',
      'static-fact-models-make-rules-agent-usable',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'agents-md-should-be-an-index',
          relation: 'contrasts-with',
          strength: 3,
          note: 'Executable rules are the repairable counterpart to prose instructions.',
        },
        {
          targetType: 'insight',
          targetSlug: 'boundaries-beat-modularity-as-a-slogan',
          relation: 'operationalizes',
          strength: 3,
          note: 'Boundary quality becomes enforceable when architecture constraints are linted.',
        },
        {
          targetType: 'insight',
          targetSlug: 'monorepo-is-context-database-if-it-has-boundaries',
          relation: 'supports',
          strength: 3,
          note: 'Large unified repos need executable guardrails to stay navigable.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tests-are-context-not-just-verification',
          relation: 'supports',
          strength: 2,
          note: 'Lint diagnostics and tests both give agents precise repair feedback.',
        },
        {
          targetType: 'insight',
          targetSlug: 'static-diagnostics-are-agent-interfaces',
          relation: 'extends',
          strength: 3,
          note: 'This decomposes executable architecture into the diagnostic contract agents repair against.',
        },
        {
          targetType: 'insight',
          targetSlug: 'static-oracles-catch-what-tests-miss',
          relation: 'supports',
          strength: 3,
          note: 'Static oracles provide the evidence for why architecture lint matters beyond behavior tests.',
        },
        {
          targetType: 'insight',
          targetSlug: 'static-fact-models-make-rules-agent-usable',
          relation: 'depends-on',
          strength: 3,
          note: 'Custom architecture rules become more valuable as the analyzer exposes richer fact families.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is one of the opinionated local practices in the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This can anchor the polint/plint example in the talk.',
        },
      ],
    },
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
    title: 'Static diagnostics are agent interfaces',
    slug: 'static-diagnostics-are-agent-interfaces',
    summary:
      'For agents, a diagnostic is a structured repair protocol: rule ID, file, span, evidence, expected surface, and machine-readable output.',
    conclusion:
      'Design lint/type/static output as an agent interface, not only as human terminal prose.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_27_static_diagnostics_are_agent_interfaces.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['static-analysis', 'diagnostics', 'ai-agents', 'quality-gates'],
    tags: ['diagnostics', 'lint', 'sarif', 'json'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'executable-architecture-beats-prose',
      'types-and-sdks-compress-intent',
      'tests-are-context-not-just-verification',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'extends',
          strength: 3,
          note: 'This is the lower-level interface shape behind executable architecture.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'supports',
          strength: 3,
          note: 'Type errors and generated SDK facts become useful when diagnostics point to repairable surfaces.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tests-are-context-not-just-verification',
          relation: 'supports',
          strength: 2,
          note: 'Both tests and diagnostics are feedback channels in the agent repair loop.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This should become the precise version of the lint/static-analysis section.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This can become a visual showing a diagnostic object as protocol.',
        },
      ],
    },
    problem:
      'Most lint output is written for humans, but agents need structured evidence they can parse and repair against.',
    whyItMatters:
      'A vague warning creates churn. A precise diagnostic lets the agent make a targeted edit and rerun the same check.',
    evidence: [
      {
        claim: 'Static/autocomplete-like tools reduce invalid dependency usage.',
        sourceTitles: ['ToolGen'],
        detail:
          'ToolGen reports dependency coverage improvements of +31.4% to +39.1% and static validity improvements of +44.9% to +57.7%.',
      },
      {
        claim: 'Type diagnostics attack the dominant generated TypeScript compile-error class.',
        sourceTitles: ['Type-Constrained Code Generation'],
        detail:
          'The paper reports that 94% of generated TypeScript compile errors are type-check errors, versus 6% syntax errors.',
      },
      {
        claim: 'Local static-analysis tooling already exposes machine-oriented repair loops.',
        sourceTitles: ['polint Agent Playbook'],
        detail:
          'The playbook documents JSON output, focused rule runs, diagnostic caps, baselines, and ignore inspection for agent remediation loops.',
      },
    ],
    caveats: [
      'Machine-readable output is not enough; the diagnostic still needs precise evidence and a repair target.',
      'Too many low-signal diagnostics can waste agent effort.',
      'Heuristic diagnostics should say they are heuristic so agents do not overfit to weak evidence.',
    ],
    openQuestions: [
      {
        question: 'What is the minimum diagnostic schema agents need for reliable repair?',
        whyItMatters:
          'This could become a practical design contract for polint/exlint and for the article examples.',
      },
    ],
    sources: [
      {
        title: 'ToolGen',
        url: 'https://arxiv.org/abs/2401.06391',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt',
        note: 'Autocomplete/static tool usage for dependency validity.',
      },
      {
        title: 'Type-Constrained Code Generation',
        url: 'https://arxiv.org/abs/2504.09246',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/type-constrained-codegen-2504.09246.txt',
        note: 'Type-check errors dominate generated TS compile failures.',
      },
      {
        title: 'A3-CodGen',
        url: 'https://arxiv.org/abs/2312.05772',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/a3-codgen-2312.05772.txt',
        note: 'Curated API retrieval helps, but too much global context hurts.',
      },
      {
        title: 'polint Agent Playbook',
        url: 'https://github.com/emilwareus/polint/blob/main/docs/AGENT-PLAYBOOK.md',
        kind: 'local-case-study',
        localRef:
          'presentations/write-code-ai-agents-love/research/articles/polint-agent-playbook.md',
        note: 'Local diagnostic loop design for agents.',
      },
    ],
  },
  {
    title: 'Static oracles catch what tests miss',
    slug: 'static-oracles-catch-what-tests-miss',
    summary:
      'Behavior tests can pass while the code misses structural intent. Static oracles check dependency shape, migration completion, and refactor alignment.',
    conclusion:
      'Use behavior tests and static oracles together: tests check outcomes; static rules check the structural shape the outcome does not encode.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_28_static_oracles_catch_what_tests_miss.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['static-analysis', 'testing', 'maintainability', 'ai-agents'],
    tags: ['static-oracles', 'codetaste', 'needle-in-the-repo', 'constraints'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'executable-architecture-beats-prose',
      'tests-are-context-not-just-verification',
      'boundaries-beat-modularity-as-a-slogan',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'supports',
          strength: 3,
          note: 'This is the empirical reason mechanically checkable architecture should be executable.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tests-are-context-not-just-verification',
          relation: 'contrasts-with',
          strength: 3,
          note: 'Tests remain necessary, but they do not encode every structural expectation.',
        },
        {
          targetType: 'insight',
          targetSlug: 'boundaries-beat-modularity-as-a-slogan',
          relation: 'supports',
          strength: 2,
          note: 'The hardest Needle in the Repo dimensions are boundary and responsibility problems.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This should back the article claim that tests alone are not enough.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This can become the CODETASTE/NITR hard-data slide.',
        },
      ],
    },
    problem:
      'A patch can satisfy narrow tests while violating the intended dependency direction, refactor shape, or maintainability constraint.',
    whyItMatters:
      'Agents are especially likely to optimize for the visible pass/fail signal. If structure is invisible, it is easy to lose.',
    evidence: [
      {
        claim: 'Behaviorally correct outputs can still be structurally wrong.',
        sourceTitles: ['Needle in the Repo'],
        detail:
          'The paper reports 64/483 behaviorally correct but structurally wrong outcomes, or 13.3%.',
      },
      {
        claim: 'Passing tests does not imply refactor alignment.',
        sourceTitles: ['CODETASTE'],
        detail:
          'GPT-5.2 open direct mode reaches 87.0% PASS but only 7.7% alignment; instructed mode reaches 76.0% PASS and 69.6% alignment.',
      },
      {
        claim: 'Production-like constraints create measurable performance decay.',
        sourceTitles: ['Constraint Decay'],
        detail:
          'Capable configurations lose 30 percentage points from L0 to L3 as architecture, database, and ORM constraints accumulate.',
      },
    ],
    caveats: [
      'Static oracles should not be treated as full design judgment.',
      'Some rules should warn rather than block, especially during adoption.',
      'The strongest claim is tests plus static oracles, not static checks instead of tests.',
    ],
    openQuestions: [
      {
        question: 'Which static oracles catch the most agent-specific regressions?',
        whyItMatters:
          'Import boundaries, migration completeness, generated-client usage, and route security are likely high-leverage candidates.',
      },
    ],
    sources: [
      {
        title: 'Needle in the Repo',
        url: 'https://arxiv.org/abs/2603.27745',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/needle-in-the-repo-2603.27745.txt',
        note: 'Functional correctness vs maintainability oracles.',
      },
      {
        title: 'CODETASTE',
        url: 'https://arxiv.org/abs/2603.04177',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/codetaste-2603.04177.txt',
        note: 'Refactoring benchmark with tests plus static rules.',
      },
      {
        title: 'Constraint Decay',
        url: 'https://arxiv.org/abs/2605.06445',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/constraint-decay-2605.06445.txt',
        note: 'Structural backend constraints reduce assertion-pass rates.',
      },
      {
        title: 'Smells of LLM Generated Code',
        url: 'https://arxiv.org/abs/2510.03029',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/smells-llm-generated-code-2510.03029.txt',
        note: 'Maintainability-risk signal for generated code.',
      },
    ],
  },
  {
    title: 'Static fact models make rules agent-usable',
    slug: 'static-fact-models-make-rules-agent-usable',
    summary:
      'Agent-useful static analysis needs stable fact families: imports, symbols, types, call graph, CFG, dataflow, tests, coverage, and generated-code metadata.',
    conclusion:
      'Do not expose raw AST dumps as the main abstraction. Expose typed, scoped fact views with visible precision and setup state.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_29_fact_models_make_static_rules_agent_usable.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['static-analysis', 'facts', 'code-graphs', 'ai-agents'],
    tags: ['fact-model', 'symbols', 'types', 'call-graph'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'types-and-sdks-compress-intent',
      'static-diagnostics-are-agent-interfaces',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'supports',
          strength: 3,
          note: 'Fact models are one way to make repository structure recoverable instead of guessed.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'extends',
          strength: 3,
          note: 'Types and generated SDKs are one family of static facts at API boundaries.',
        },
        {
          targetType: 'insight',
          targetSlug: 'static-diagnostics-are-agent-interfaces',
          relation: 'depends-on',
          strength: 3,
          note: 'Good diagnostics require trustworthy facts behind the message.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'This is a deeper research backing note, likely compressed heavily in the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This can appear as the static-analysis ladder visual.',
        },
      ],
    },
    problem:
      'Many high-value architecture policies need more than string matching: resolved imports, public API facts, symbols, types, calls, control flow, dataflow, and test evidence.',
    whyItMatters:
      'Agents need the analyzer to expose relationships as stable facts. Otherwise rules either stay shallow or become brittle parser hacks.',
    evidence: [
      {
        claim: 'Cross-file API context materially improves repository completion.',
        sourceTitles: ['CrossCodeEval'],
        detail:
          'StarCoder-15.5B Python exact match rises from 8.82% in-file only to 15.72% with retrieved context and 21.01% with reference-assisted retrieval.',
      },
      {
        claim: 'Type/code context improves repository-level generation.',
        sourceTitles: ['CatCoder'],
        detail:
          'CatCoder reports Java pass@k improvements up to +17.35% and compile@k improvements up to +14.44% over RepoCoder.',
      },
      {
        claim: 'Curated API/fact retrieval beats indiscriminate context expansion.',
        sourceTitles: ['A3-CodGen'],
        detail: 'Global retrieval F1 drops from 0.601 at k=5 to 0.526 at k=10 and 0.479 at k=15.',
      },
    ],
    caveats: [
      'Syntax-only rules are still valuable; not every policy needs semantic facts.',
      'Graph/fact context should be queried as scoped neighborhoods, not dumped wholesale.',
      'Typed fact APIs need setup diagnostics so missing project configuration does not look like an empty result.',
    ],
    openQuestions: [
      {
        question: 'Which fact families should be built first for agent-facing architecture rules?',
        whyItMatters:
          'The likely priority is resolved imports, symbols/references, type facts, test evidence, CFG, call graph, and dataflow.',
      },
    ],
    sources: [
      {
        title: 'CrossCodeEval',
        url: 'https://arxiv.org/abs/2310.11248',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/crosscodeeval-2310.11248.txt',
        note: 'Cross-file context for repository code completion.',
      },
      {
        title: 'CatCoder',
        url: 'https://arxiv.org/abs/2406.03283',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/catcoder-2406.03283.txt',
        note: 'Code and type context for repository-level generation.',
      },
      {
        title: 'ToolGen',
        url: 'https://arxiv.org/abs/2401.06391',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt',
        note: 'Static/autocomplete-like symbols as generation tools.',
      },
      {
        title: 'A3-CodGen',
        url: 'https://arxiv.org/abs/2312.05772',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/a3-codgen-2312.05772.txt',
        note: 'API retrieval and over-retrieval caveat.',
      },
      {
        title: 'CodeGRAG',
        url: 'https://arxiv.org/abs/2405.02355',
        kind: 'paper',
        localRef:
          'presentations/write-code-ai-agents-love/research/paper-text/codegrag-2405.02355.txt',
        note: 'Graph views for retrieval-augmented code generation.',
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_24_context_files_are_config_with_debt.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'contrasts-with',
          strength: 3,
          note: 'Instruction files help only when they point at recoverable structure.',
        },
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'contrasts-with',
          strength: 3,
          note: 'Executable rules should carry policy that prose instructions cannot reliably enforce.',
        },
        {
          targetType: 'insight',
          targetSlug: 'agents-run-orient-retrieve-edit-verify',
          relation: 'operationalizes',
          strength: 2,
          note: 'A scoped AGENTS.md is most useful during agent orientation.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This becomes the instruction-file guidance in the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This supports a short slide about context files as indexes.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'context-engineering-claude-code',
          relation: 'extends',
          strength: 3,
          note: 'This is the Brain continuation of the earlier AGENTS/context-engineering material.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_04_tests_are_the_agent_feedback_loop.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['testing', 'verification', 'ai-agents'],
    tags: ['tests', 'verification', 'feedback'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['agents-run-orient-retrieve-edit-verify', 'types-and-sdks-compress-intent'],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'agents-run-orient-retrieve-edit-verify',
          relation: 'supports',
          strength: 3,
          note: 'Tests make the verify stage observable instead of aspirational.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'supports',
          strength: 2,
          note: 'Typed contracts and tests together reduce plausible wrong integration paths.',
        },
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'supports',
          strength: 2,
          note: 'Both checks turn repository expectations into concrete failure signals.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This becomes the verification section of the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This gives the talk a practical warning against test theater.',
        },
      ],
    },
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
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_19_monorepos_are_agent_context_infrastructure.md',
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
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'recoverable-structure-beats-prompt-volume',
          relation: 'extends',
          strength: 3,
          note: 'A monorepo is the repository-scale version of recoverable context.',
        },
        {
          targetType: 'insight',
          targetSlug: 'executable-architecture-beats-prose',
          relation: 'depends-on',
          strength: 3,
          note: 'A large context database needs executable rules to prevent entropy.',
        },
        {
          targetType: 'insight',
          targetSlug: 'types-and-sdks-compress-intent',
          relation: 'supports',
          strength: 2,
          note: 'Schema, generated SDKs, and app code become inspectable together.',
        },
        {
          targetType: 'insight',
          targetSlug: 'boundaries-beat-modularity-as-a-slogan',
          relation: 'depends-on',
          strength: 3,
          note: 'The monorepo only helps when package and ownership boundaries are clear.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'This is one of the author-specific infrastructure flavors in the article.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'write-code-ai-agents-love-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This belongs in the talk as context-database framing.',
        },
      ],
    },
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
  {
    title: 'Agent instructions are configuration, not documentation',
    slug: 'agent-instructions-are-config',
    summary:
      'AGENTS.md, CLAUDE.md, and Cursor rules should be treated as operational configuration: short, specific, versioned, and tested by observing agent behavior.',
    conclusion:
      'Root instructions should include exact commands, architecture summary, hard constraints, and verification expectations. Exclude stale changelogs, generic advice, and aspirational rules.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_02_agent_instructions_are_config.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'context-engineering', 'agent-instructions'],
    tags: ['agents-md', 'configuration', 'instructions'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['agents-md-should-be-an-index', 'recoverable-structure-beats-prompt-volume'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the instruction-file section of the article.',
        },
      ],
    },
    problem:
      'Teams treat agent instruction files like READMEs. They become stale, long, and aspirational instead of operational.',
    whyItMatters:
      'Instruction files that drift from reality add cost and noise. Treating them as config forces maintenance discipline.',
    evidence: [
      {
        claim: 'AGENTS.md reduces median runtime and output tokens when well-written.',
        sourceTitles: ['AGENTS.md impact'],
        detail:
          'Lulla et al. compare runs with and without AGENTS.md across 10 repos and 124 PRs, reporting lower median runtime and reduced token consumption.',
      },
      {
        claim: 'Context files can reduce success and increase cost when poorly written.',
        sourceTitles: ['Evaluating AGENTS.md'],
        detail:
          'Gloaguen et al. show context files can trigger more exploration and cost without improving patches.',
      },
      {
        claim:
          'Architecture, commands, and project rules are the central concerns of real config files.',
        sourceTitles: ['Claude Code configs study'],
        detail:
          'Santos et al. analyze 328 Claude Code configs and find architecture, testing, and commands dominate.',
      },
    ],
    caveats: [
      'Different tools consume instruction files differently.',
      'The optimal length and content depend on repo size and task type.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'AGENTS.md impact',
        url: 'https://arxiv.org/abs/2601.20404',
        kind: 'paper',
        note: 'Positive instruction-file efficiency result.',
      },
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        note: 'Counter-evidence and cost analysis.',
      },
      {
        title: 'Claude Code configs study',
        url: 'https://arxiv.org/abs/2511.09268',
        kind: 'paper',
        note: 'Analysis of real Claude Code configuration files.',
      },
    ],
  },
  {
    title: 'Reproducible setup is agent infrastructure',
    slug: 'reproducible-setup-is-agent-infrastructure',
    summary:
      'Agent performance depends on whether the repository can be installed, built, and tested from scratch without tacit human knowledge.',
    conclusion:
      'Agent-friendly repos need pinned lockfiles, one-command install, one-command test, explicit env vars, and no hidden manual setup.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_03_reproducible_setup_is_agent_infrastructure.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'setup', 'infrastructure'],
    tags: ['setup', 'reproducibility', 'lockfiles'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['setup-is-part-of-the-task', 'agents-md-should-be-an-index'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the setup infrastructure section.',
        },
      ],
    },
    problem:
      'Many repos require tribal knowledge to build and test. Agents cannot ask a colleague for help.',
    whyItMatters:
      'If a new laptop cannot run the repo, neither can a fresh agent. Setup ambiguity is the first bottleneck.',
    evidence: [
      {
        claim: 'LLM agents struggle to install Python projects even with documentation.',
        sourceTitles: ['Installamatic'],
        detail:
          'Beyond pip install evaluates agents installing Python projects; average installation rate was 28.8%.',
      },
      {
        claim: 'Setup is a nontrivial benchmark problem on its own.',
        sourceTitles: ['SetupBench'],
        detail:
          'SetupBench isolates environment bootstrap and local service configuration as a direct benchmark.',
      },
    ],
    caveats: [
      'Some systems are inherently multi-service and cannot have trivial setup.',
      'Containerized setups help but add their own complexity.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Installamatic',
        url: 'https://arxiv.org/abs/2412.06294',
        kind: 'paper',
        note: 'LLM agents installing Python repositories from docs.',
      },
      {
        title: 'SetupBench',
        url: 'https://arxiv.org/abs/2507.09063',
        kind: 'paper',
        note: 'Agent repository/environment setup benchmark.',
      },
    ],
  },
  {
    title: 'Simplicity beats agent theater',
    slug: 'simplicity-beats-agent-theater',
    summary:
      'Complex agent orchestration is not a replacement for clear repository structure and deterministic validation.',
    conclusion:
      'Before adding agent complexity, fix the repository: clear task contracts, reliable tests, searchable structure, precise instructions, and reproducible setup.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_07_simplicity_beats_agent_theater.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'architecture', 'simplicity'],
    tags: ['agents', 'orchestration', 'simplicity'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'agents-run-orient-retrieve-edit-verify',
      'recoverable-structure-beats-prompt-volume',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Anchors the argument that repo quality matters more than agent sophistication.',
        },
      ],
    },
    problem:
      'Teams invest in complex multi-agent orchestration before fixing basic repo navigation and validation.',
    whyItMatters: 'If the repo is opaque, more agents just parallelize confusion.',
    evidence: [
      {
        claim: 'A simple localize-repair-validate workflow can match elaborate agents.',
        sourceTitles: ['Agentless'],
        detail:
          'Agentless demonstrates competitive performance with a straightforward localize, repair, validate workflow.',
      },
      {
        claim: 'Sophisticated scaffolding yields only marginal gains in context retrieval.',
        sourceTitles: ['ContextBench'],
        detail:
          'ContextBench finds elaborate retrieval scaffolding produces marginal improvements over simpler approaches.',
      },
    ],
    caveats: [
      'Orchestration is valuable for tasks that genuinely need parallel exploration.',
      'Simplicity does not mean minimal tooling; it means correct tooling.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Agentless',
        url: 'https://arxiv.org/abs/2407.01489',
        kind: 'paper',
        note: 'Simple localize-repair-validate agent workflow.',
      },
    ],
  },
  {
    title: 'Context should be layered, not dumped',
    slug: 'context-should-be-layered',
    summary:
      'The best agent context is layered: a small hot path loaded by default, and deeper cold context fetched only when relevant.',
    conclusion:
      'Default context should orient. On-demand context should explain. Use root files for invariants and subdirectory files for local conventions.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_08_context_should_be_layered.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['context-engineering', 'ai-agents', 'retrieval'],
    tags: ['context', 'layering', 'progressive-disclosure'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'agents-md-should-be-an-index',
      'more-context-can-hurt',
      'recoverable-structure-beats-prompt-volume',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the context layering argument in the article.',
        },
      ],
    },
    problem:
      'Teams dump everything into one context file. Context windows fill quickly and performance degrades as sessions grow.',
    whyItMatters:
      'Layered context prevents noise and keeps the hot path compact while preserving deeper knowledge for retrieval.',
    evidence: [
      {
        claim: 'Hot-memory instructions plus cold-memory specs work well for large systems.',
        sourceTitles: ['Codified Context'],
        detail:
          'Codified Context describes hot-memory instructions plus cold-memory specification documents for a large C# system.',
      },
      {
        claim: 'Context files can create too much exploration and cost when not layered.',
        sourceTitles: ['Evaluating AGENTS.md'],
        detail:
          'Evaluating AGENTS.md shows context files can increase exploration and cost without improving patches.',
      },
    ],
    caveats: [
      'The optimal layering depends on repo size and agent tool capabilities.',
      'Subdirectory context files must be maintained when conventions change.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        note: 'Context file cost and noise evidence.',
      },
    ],
  },
  {
    title: 'Long context still needs structure',
    slug: 'long-context-still-needs-structure',
    summary:
      'Large context windows do not eliminate the need for repository retrieval, maps, and scoped documentation.',
    conclusion:
      'A million-token window is not a map. Repos should support progressive disclosure: root maps, scoped docs, symbol maps, and focused task specs.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_09_long_context_needs_structure.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['context-engineering', 'retrieval', 'ai-agents'],
    tags: ['long-context', 'retrieval', 'structure'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'context-should-be-layered',
      'more-context-can-hurt',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Backs the argument that window size is not a substitute for structure.',
        },
      ],
    },
    problem:
      'Teams assume larger context windows solve retrieval problems. Models still underuse information depending on placement.',
    whyItMatters:
      'A bigger room to get lost in is not a map. Structure helps agents find and use relevant context.',
    evidence: [
      {
        claim: 'Models underuse relevant information depending on position in long context.',
        sourceTitles: ['Lost in the Middle'],
        detail:
          'Lost in the Middle shows models can miss relevant information based on where it appears in long context.',
      },
      {
        claim: 'Agents often retrieve too much context and still fail to use relevant material.',
        sourceTitles: ['ContextBench'],
        detail:
          'ContextBench shows agents can retrieve many relevant files but fail to use them in the final patch.',
      },
    ],
    caveats: [
      'Newer models may handle long context better, but structural cues remain valuable.',
      'The threshold where structure helps depends on task complexity.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Lost in the Middle',
        url: 'https://arxiv.org/abs/2307.03172',
        kind: 'paper',
        note: 'Position-dependent information usage in long context.',
      },
    ],
  },
  {
    title: 'Agent-friendly repos help agents not edit',
    slug: 'agent-friendly-repos-support-noop',
    summary:
      'Good coding agents must sometimes conclude that no code change is required. Repositories should make this defensible.',
    conclusion:
      'Agent-ready repos should expose current behavior docs, existing contract tests, and review guidance that flags unnecessary churn.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_10_abstention_and_noop.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'verification', 'no-op'],
    tags: ['noop', 'abstention', 'verification'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['tests-are-context-not-just-verification', 'setup-is-part-of-the-task'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the verification section: knowing when not to edit.',
        },
      ],
    },
    problem:
      'Strong agents often propose unnecessary code changes on already-fixed tasks. Confidence does not equal correctness.',
    whyItMatters: 'The most expensive agent bug is the confident edit you did not need.',
    evidence: [
      {
        claim: 'Agents often make unnecessary changes on already-fixed tasks.',
        sourceTitles: ['FixedBench'],
        detail:
          'FixedBench reports 35-65% undesirable code changes on already-fixed tasks across tested models.',
      },
      {
        claim: 'Functional tests can miss structural maintainability failures.',
        sourceTitles: ['Needle in the Repo'],
        detail:
          'Needle in the Repo separates functional tests from structural maintainability oracles.',
      },
    ],
    caveats: [
      'No-op detection is hard to benchmark because it requires knowing the ground truth.',
      'Explicit abstention prompting helps but is not a complete solution.',
    ],
    openQuestions: [
      {
        question: 'Can repos expose a standard "is this already fixed?" verification path?',
        whyItMatters: 'A reproduction command that passes should signal no change needed.',
      },
    ],
    sources: [
      {
        title: 'FixedBench',
        url: 'https://arxiv.org/abs/2605.07769',
        kind: 'paper',
        note: 'No-op task evaluation for coding agents.',
      },
    ],
  },
  {
    title: 'Task specs are part of the codebase',
    slug: 'task-specs-are-part-of-the-codebase',
    summary:
      'For nontrivial work, the task description is a code artifact. It should be scoped, versioned, and verifiable.',
    conclusion:
      'Every task spanning more than one edit cycle should include goal, scope, relevant files, constraints, validation commands, and expected output.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'task-specification', 'planning'],
    tags: ['task-specs', 'planning', 'scoping'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'feature-work-fails-at-planning-and-constraints',
      'agents-md-should-be-an-index',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the task-specification guidance section.',
        },
      ],
    },
    problem: 'Agents do not read your mind. Vague issues produce vague patches.',
    whyItMatters:
      'Well-scoped issues with named artifacts and validation commands correlate with better agent PRs.',
    evidence: [
      {
        claim: 'Vendor guidance converges on bounded tasks with explicit validation.',
        sourceTitles: ['Anthropic large-codebase Claude Code guidance'],
        detail:
          'OpenAI, Anthropic, GitHub, Cursor, and Augment all recommend bounded tasks with file paths, examples, and validation.',
      },
      {
        claim: 'Planning and iterative refinement matter for repository-level tasks.',
        sourceTitles: ['CodePlan'],
        detail:
          'CodePlan and SWE-Search show planning and iterative refinement improve multi-file task success.',
      },
    ],
    caveats: [
      'Over-specifying trivial tasks wastes time.',
      'Task specs themselves need maintenance and review.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Anthropic large-codebase Claude Code guidance',
        url: 'https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start',
        kind: 'popular-article',
        note: 'Vendor task-scoping guidance.',
      },
    ],
  },
  {
    title: 'Dependency structure beats text blobs',
    slug: 'dependency-structure-beats-text-blobs',
    summary:
      'AI coding agents perform better when repositories expose dependency structure: imports, calls, type relationships, and build edges.',
    conclusion:
      'Keep import direction explicit, avoid hidden dynamic registration, maintain generated dependency maps, and align folders with architecture.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_12_dependency_structure_beats_text_blobs.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['retrieval', 'code-graphs', 'ai-agents'],
    tags: ['dependencies', 'graphs', 'imports'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'repo-graphs-need-selective-slices',
      'static-fact-models-make-rules-agent-usable',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the dependency-structure section of the article.',
        },
      ],
    },
    problem:
      'Plain text similarity is not enough for repository-scale coding. Hidden dynamic registration, reflection, and stringly typed coupling block agent navigation.',
    whyItMatters:
      'Agents need relationships, not just files. Explicit dependency structure makes cross-file tasks tractable.',
    evidence: [
      {
        claim: 'Graph-guided retrieval outperforms plain text retrieval in repo-level generation.',
        sourceTitles: ['GraphCodeAgent'],
        detail:
          'GraphCodeAgent reports +43.81% relative Pass@1 improvement and +94.30% on cross-file dependency tasks.',
      },
      {
        claim: 'Program slicing with semantic descriptions improves retrieval by 48-67%.',
        sourceTitles: ['SLICE'],
        detail:
          'SLICE combines semantic descriptions with backward program slicing, reporting 48-67% improvements over no-retrieval.',
      },
    ],
    caveats: [
      'Agents do not need every graph dumped into context; they need compact, task-relevant slices.',
      'Graph construction has setup costs that must be amortized.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'GraphCodeAgent',
        url: 'https://arxiv.org/abs/2504.10046',
        kind: 'paper',
        note: 'Graph-guided repo-level code generation.',
      },
    ],
  },
  {
    title: 'Types and static surfaces reduce hallucinated APIs',
    slug: 'types-reduce-hallucinated-apis',
    summary:
      'Agents need to know which members, functions, and external APIs are actually available. Typed and static-analysis-visible surfaces reduce invalid-code errors.',
    conclusion:
      'Use explicit exports, typed public APIs, generated clients, reliable typecheck commands, and approved library lists.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_14_types_and_static_surfaces_reduce_hallucinated_apis.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['types', 'static-analysis', 'ai-agents'],
    tags: ['types', 'hallucination', 'apis'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'types-and-sdks-compress-intent',
      'static-diagnostics-are-agent-interfaces',
      'static-surfaces-are-agent-affordances',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the types-as-guardrails section.',
        },
      ],
    },
    problem:
      'Agents confidently generate calls to APIs that do not exist. Without type visibility, there is no compile-time feedback.',
    whyItMatters:
      'Static surfaces do not solve logical correctness, but they reduce symbol/API hallucination and make verification cheaper.',
    evidence: [
      {
        claim: 'Autocompletion-visible identifiers help agents generate valid code.',
        sourceTitles: ['ToolGen'],
        detail:
          'ToolGen reports dependency coverage improvements of +31.4% to +39.1% and static validity improvements of +44.9% to +57.7%.',
      },
      {
        claim: 'Removing type context reduces repository-level generation performance.',
        sourceTitles: ['CatCoder'],
        detail: 'CatCoder reports Java pass@k drop of up to 11.57% when type context is removed.',
      },
    ],
    caveats: [
      'Static surfaces do not guarantee logical correctness.',
      'Overly strict types can create friction without proportional safety.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'ToolGen',
        url: 'https://arxiv.org/abs/2401.06391',
        kind: 'paper',
        note: 'Static/autocomplete tools for dependency validity.',
      },
      {
        title: 'CatCoder',
        url: 'https://arxiv.org/abs/2406.03283',
        kind: 'paper',
        note: 'Repo-level generation with code and type context.',
      },
    ],
  },
  {
    title: 'More context can hurt',
    slug: 'more-context-can-hurt',
    summary:
      'Large context windows and long instruction files do not automatically improve agent performance. Irrelevant context raises cost and can reduce success.',
    conclusion:
      'Put only durable, mandatory facts in root AGENTS.md. Use scoped docs and selective retrieval for specialized workflows.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_16_more_context_can_hurt.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['context-engineering', 'ai-agents', 'retrieval'],
    tags: ['context', 'noise', 'cost'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'context-should-be-layered',
      'long-context-still-needs-structure',
      'agents-md-should-be-an-index',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Backs the argument for scoped, not maximized, context.',
        },
      ],
    },
    problem:
      'Adding more context seems safe but can reduce success and increase cost when irrelevant material crowds out signal.',
    whyItMatters:
      'This is not an argument for less documentation. It is an argument for layered, scoped, retrievable documentation.',
    evidence: [
      {
        claim: 'Context files tended to reduce success and increased cost by over 20%.',
        sourceTitles: ['Evaluating AGENTS.md'],
        detail:
          'Evaluating AGENTS.md found context files reduced average resolution rate and increased inference cost.',
      },
      {
        claim: 'Adding too much global context can underperform selective context.',
        sourceTitles: ['A3-CodGen'],
        detail:
          'A3-CodGen reports that global retrieval F1 drops from 0.601 at k=5 to 0.479 at k=15.',
      },
    ],
    caveats: [
      'The effect depends on context quality, not just quantity.',
      'Some tasks genuinely need broad context.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Evaluating AGENTS.md',
        url: 'https://arxiv.org/abs/2602.11988',
        kind: 'paper',
        note: 'Context file cost analysis.',
      },
    ],
  },
  {
    title: 'Quality gates must cover smells, not just behavior',
    slug: 'quality-gates-must-cover-smells',
    summary:
      'Passing behavior tests is not enough. Agent-generated code can be correct-looking while introducing structural quality problems.',
    conclusion:
      'Run lint, typecheck, format, dead-code checks, and complexity rules. Use "no new warnings" CI policy and review checklists for agent-specific smells.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_17_quality_gates_must_cover_smells.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['quality-gates', 'static-analysis', 'ai-agents'],
    tags: ['smells', 'lint', 'quality'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'static-oracles-catch-what-tests-miss',
      'executable-architecture-beats-prose',
      'codehealth-predicts-refactoring-success',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the quality-gate and smell-detection section.',
        },
      ],
    },
    problem:
      'Agent-generated code has substantially higher smell incidence than professional references, including implementation and design smells.',
    whyItMatters:
      'A curated test suite and static gates remain the more reliable oracle. Agent-generated tests alone are insufficient.',
    evidence: [
      {
        claim:
          'LLM-generated Java code has substantially higher smell incidence than professional references.',
        sourceTitles: ['Smells of LLM Generated Code'],
        detail:
          'The paper reports higher incidence of implementation and design smells in LLM-generated code.',
      },
      {
        claim: 'Asking agents to write more tests does not reliably improve patch success.',
        sourceTitles: ['Rethinking agent-generated tests'],
        detail: 'Agent test-writing activity is not equivalent to useful validation signal.',
      },
    ],
    caveats: [
      'Static metrics are imperfect proxies for quality.',
      'Overly strict gates can slow development without proportional benefit.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Smells of LLM Generated Code',
        url: 'https://arxiv.org/abs/2510.03029',
        kind: 'paper',
        note: 'Smell incidence in LLM-generated code.',
      },
    ],
  },
  {
    title: 'Generated SDKs turn API contracts into code',
    slug: 'generated-sdks-turn-api-contracts-into-code',
    summary:
      'Agents should not hand-roll raw API calls when a typed, generated client can be produced from the API contract.',
    conclusion:
      'Treat OpenAPI/protobuf as first-class source artifacts. Generate clients in CI, ban raw calls to internal APIs, and keep generated code in predictable folders.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_20_generated_sdks_turn_api_contracts_into_code.md',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-23',
    topics: ['apis', 'generated-sdks', 'ai-agents'],
    tags: ['sdk', 'openapi', 'code-generation'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['types-and-sdks-compress-intent', 'types-reduce-hallucinated-apis'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Detailed guidance for the generated-SDK section.',
        },
      ],
    },
    problem:
      'Raw fetch calls hide API contracts in strings. Agents miss URL paths, query names, request bodies, response shapes, and error handling.',
    whyItMatters:
      'Generated SDKs convert remote API behavior into searchable, typed, versioned code that agents can import and typecheck.',
    evidence: [
      {
        claim: 'API documentation helps code generation models.',
        sourceTitles: ['DocPrompting'],
        detail:
          'DocPrompting shows API documentation improves code generation by providing context about available endpoints.',
      },
      {
        claim: 'Type constraints and available symbols reduce invalid code.',
        sourceTitles: ['Type-Constrained Code Generation', 'ToolGen'],
        detail:
          'Type constraints reduce compile errors by 74.8% on HumanEval; ToolGen improves static validity by +44.9% to +57.7%.',
      },
    ],
    caveats: [
      'Generated clients are only as good as the spec. A stale OpenAPI file creates typed lies.',
      'Generated SDKs can be noisy; keep them isolated and marked as generated.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Type-Constrained Code Generation',
        url: 'https://arxiv.org/abs/2504.09246',
        kind: 'paper',
        note: 'Type constraints reduce compilation errors.',
      },
      {
        title: 'OpenAPI Generator',
        url: 'https://openapi-generator.tech/',
        kind: 'official-doc',
        note: 'OpenAPI-based client generation tool.',
      },
    ],
  },
  {
    title: 'Repository graphs need selective slices',
    slug: 'repo-graphs-need-selective-slices',
    summary:
      'Agents benefit from explicit repository structure, but the graph must be queried as a selective slice. Dumping the whole graph into context hurts.',
    conclusion:
      'Make repository relationships recoverable, auditable, and selectively retrievable. Use compact slices, not full graph dumps.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_21_repository_graphs_need_selective_slices.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['retrieval', 'code-graphs', 'ai-agents'],
    tags: ['graphs', 'retrieval', 'selective-context'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'recoverable-structure-beats-prompt-volume',
      'dependency-structure-beats-text-blobs',
      'more-context-can-hurt',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'Core evidence for the graph-context section with specific data.',
        },
      ],
    },
    problem:
      'Repository work requires relationships across files, but larger graph neighborhoods add both useful signal and irrelevant paths.',
    whyItMatters:
      'The RIG paper shows +12.2% accuracy and -53.9% completion time with explicit repo maps. But RepoGraph shows 2-hop context is worse than 1-hop.',
    evidence: [
      {
        claim:
          'Repository Intelligence Graph improves agent accuracy by +12.2% and reduces time by -53.9%.',
        sourceTitles: ['Repository Intelligence Graph'],
        detail:
          'RIG measures deterministic repo maps for commercial agents; gains grow with repo complexity.',
      },
      {
        claim: 'Larger graph context can perform worse than smaller slices.',
        sourceTitles: ['RepoGraph'],
        detail:
          'RepoGraph 2-hop flat context uses 10,505 tokens but resolves 26.00% vs 1-hop at 2,310 tokens resolving 29.67%.',
      },
      {
        claim: 'Graph-guided traversal outperforms static blob context.',
        sourceTitles: ['GraphCodeAgent'],
        detail:
          'Removing SSCGTraverse dropped Pass@1 from 58.14 to 51.83. The agent needs to walk the graph, not receive a static blob.',
      },
    ],
    caveats: [
      'Not every repo needs an explicit graph file.',
      'RepoGraph absolute gains on SWE-bench Lite are modest.',
    ],
    openQuestions: [
      {
        question: 'What is the right graph granularity for product repos?',
        whyItMatters: 'Academic benchmarks may not capture product-specific domain conventions.',
      },
    ],
    sources: [
      {
        title: 'Repository Intelligence Graph',
        url: 'https://arxiv.org/abs/2601.10112',
        kind: 'paper',
        note: 'Deterministic repo maps for agent orientation.',
      },
      {
        title: 'RepoGraph',
        url: 'https://arxiv.org/abs/2410.14684',
        kind: 'paper',
        note: 'Graph context helps but bigger is not always better.',
      },
    ],
  },
  {
    title: 'Feature work fails at planning and constraints',
    slug: 'feature-work-fails-at-planning-and-constraints',
    summary:
      'Feature-addition tasks fail more often at planning, constraint satisfaction, and step fidelity than at localization. Patch application is not resolution.',
    conclusion:
      'Feature-friendly codebases must expose extension points, constraints, examples, and acceptance tests so agents do not invent plans against hidden rules.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_22_feature_work_fails_at_planning_and_constraints.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'feature-work', 'planning'],
    tags: ['features', 'planning', 'constraints'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'task-specs-are-part-of-the-codebase',
      'static-oracles-catch-what-tests-miss',
      'executable-architecture-beats-prose',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'Core evidence for the feature-work section.',
        },
      ],
    },
    problem:
      'Agents can apply patches cleanly while misunderstanding the change. RACE-bench shows 67 pp gap between patch apply and resolution for some agents.',
    whyItMatters:
      'Structural constraints create ~30 pp performance decay. Hidden architecture rules force agents to infer while implementing.',
    evidence: [
      {
        claim: 'Patch application rate far exceeds resolution rate in feature tasks.',
        sourceTitles: ['RACE-bench'],
        detail:
          'AutoCodeRover: 96.21% apply, 28.79% resolved (67.42 pp gap). mini-SWE-Agent step recall drops to 0.445.',
      },
      {
        claim: 'Production-like structural constraints cause ~30 pp assertion-pass decay.',
        sourceTitles: ['Constraint Decay'],
        detail:
          'Capable configurations lose about 30 pp from L0 to L3 as framework, architecture, and ORM constraints accumulate.',
      },
      {
        claim: 'Agents execute specified refactors far better than they discover them.',
        sourceTitles: ['CODETASTE'],
        detail:
          'GPT-5.2 instructed: 69.6% alignment. Open direct: 7.7% alignment. Detailed specs matter.',
      },
    ],
    caveats: [
      'These benchmarks measure different task definitions and should not be merged into one leaderboard.',
      'Planning alone does not solve open-ended work; the plan must be grounded in visible structure.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'RACE-bench',
        url: 'https://arxiv.org/abs/2603.26337',
        kind: 'paper',
        note: 'Feature-addition reasoning and planning evaluation.',
      },
      {
        title: 'Constraint Decay',
        url: 'https://arxiv.org/abs/2605.06445',
        kind: 'paper',
        note: 'Structural constraints reduce agent success by ~30 pp.',
      },
    ],
  },
  {
    title: 'Setup is part of the task',
    slug: 'setup-is-part-of-the-task',
    summary:
      'Agents treat setup as the first task. If the environment cannot be bootstrapped deterministically, agents burn reasoning and tokens before touching the actual work.',
    conclusion:
      'Expose setup state as a machine-checkable contract: one-command install, fresh-shell verification, targeted test slices, and explicit reproduction paths.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_23_setup_is_part_of_the_task.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'setup', 'verification'],
    tags: ['setup', 'bootstrap', 'verification'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'reproducible-setup-is-agent-infrastructure',
      'agent-friendly-repos-support-noop',
      'tests-are-context-not-just-verification',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'Core evidence for the setup-as-infrastructure section.',
        },
      ],
    },
    problem:
      'Setup failures are hidden inside later failures. A test fails but was the product broken, the dependency missing, or the runtime wrong?',
    whyItMatters:
      'SetupBench shows best-case 62.4% success. Installamatic shows 28.8% average install rate. Setup ambiguity is expensive.',
    evidence: [
      {
        claim: 'Even strong scaffolds do not reliably finish setup.',
        sourceTitles: ['SetupBench'],
        detail:
          'Best OpenHands overall success: 62.4%. Repo setup: 38.9-57.4%. Local DB: 20.0-53.3%. Wasted steps: 38-69%.',
      },
      {
        claim: 'Finding docs is not enough for successful installation.',
        sourceTitles: ['Installamatic'],
        detail:
          'Average installation rate 28.8%. Perfect recall rate 34.7%. Average attempt time 501 seconds.',
      },
      {
        claim: 'A runnable environment helps agents decide no change is needed.',
        sourceTitles: ['FixedBench'],
        detail:
          'Removing git history and setup signals lowers abstention rate. Existing tests improve it.',
      },
    ],
    caveats: [
      'Not every project can have trivial one-command setup.',
      'Agent-written tests are not a substitute for environment health.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'SetupBench',
        url: 'https://arxiv.org/abs/2507.09063',
        kind: 'paper',
        note: 'Setup-as-benchmark evidence.',
      },
      {
        title: 'Installamatic',
        url: 'https://arxiv.org/abs/2412.06294',
        kind: 'paper',
        note: 'Agent installation study.',
      },
    ],
  },
  {
    title: 'Agentic PRs have a different shape',
    slug: 'agentic-prs-have-different-shape',
    summary:
      'Agent-written merged PRs have measurably different commit counts, file touches, additions, deletions, and similarity profiles compared to human PRs.',
    conclusion:
      'Code review should not treat agent PRs as normal human PRs. Watch for broad file touches, low deletion, compatibility shims, and generated files edited by hand.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_25_agentic_prs_have_a_different_shape.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['ai-agents', 'code-review', 'pr-shape'],
    tags: ['prs', 'review', 'change-shape'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['quality-gates-must-cover-smells', 'static-oracles-catch-what-tests-miss'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Supports the agent-PR review guidance section.',
        },
      ],
    },
    problem:
      'Agentic PRs are now at ecosystem scale (932K PRs in AIDev). Their patch shape, similarity, and failure modes differ from human PRs.',
    whyItMatters:
      'Agent-friendly codebases need affordances for generation and guardrails for review. The same artifacts help both.',
    evidence: [
      {
        claim: 'Agentic PRs differ from human PRs with medium to large practical effect sizes.',
        sourceTitles: ['How AI Coding Agents Modify Code'],
        detail:
          'Cliff delta: commits 0.54 (large), files 0.45 (medium), deletions 0.45 (medium), additions 0.28 (small).',
      },
      {
        claim: 'Readability-intended agent commits often increase size and complexity.',
        sourceTitles: ['Do AI Agents Really Improve Code Readability?'],
        detail:
          '56.1% of readability commits deteriorated Maintainability Index. 71.5% increased Lines of Code.',
      },
    ],
    caveats: [
      'AIDev is a dataset; it does not score PR quality directly.',
      'Static readability metrics are signals, not truth.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'AIDev',
        url: 'https://arxiv.org/abs/2602.09185',
        kind: 'paper',
        note: 'Large-scale agentic PR dataset.',
      },
      {
        title: 'How AI Coding Agents Modify Code',
        url: 'https://arxiv.org/abs/2601.17581',
        kind: 'paper',
        note: 'Agentic vs human PR change-shape comparison.',
      },
    ],
  },
  {
    title: 'Static surfaces are agent affordances',
    slug: 'static-surfaces-are-agent-affordances',
    summary:
      'Agents read repos through surfaces: names, imports, types, declarations, generated clients, schemas, tests, and diagnostics. Hidden behavior forces inference.',
    conclusion:
      'Turn hidden contracts into local static affordances. Generated SDKs, package exports, TypeScript interfaces, and custom lint rules all reduce the inference gap.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_26_static_surfaces_are_agent_affordances.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['static-analysis', 'apis', 'ai-agents'],
    tags: ['affordances', 'types', 'sdks', 'names'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'types-and-sdks-compress-intent',
      'names-are-semantic-infrastructure',
      'types-reduce-hallucinated-apis',
      'dependency-structure-beats-text-blobs',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'Synthesizes the names/types/SDK/lint evidence into one practical pattern.',
        },
      ],
    },
    problem:
      'Hidden behavior behind raw strings, reflection, dynamic registration, or tribal docs forces the agent to infer rather than search.',
    whyItMatters:
      'CrossCodeEval shows almost 100% of references need cross-file information. Only ~2% are predictable from the current file.',
    evidence: [
      {
        claim: 'Cross-file API context materially improves repository completion.',
        sourceTitles: ['CrossCodeEval'],
        detail: 'StarCoder-15.5B Python EM improved from 8.82 to 15.72 with retrieved context.',
      },
      {
        claim: 'Type constraints reduce the dominant compile-error class in generated TypeScript.',
        sourceTitles: ['Type-Constrained Code Generation'],
        detail:
          '94% of generated TS compile errors are type-check errors. Type constraints reduce them by 74.8%.',
      },
      {
        claim: 'Name obfuscation sharply hurts intent summarization.',
        sourceTitles: ['When Names Disappear'],
        detail: 'GPT-4o class summarization dropped from 87.3 to 58.7 after name obfuscation.',
      },
    ],
    caveats: [
      'Types prove shape, not business correctness.',
      'Generated SDKs are only as correct as the underlying schema.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'CrossCodeEval',
        url: 'https://arxiv.org/abs/2310.11248',
        kind: 'paper',
        note: 'Cross-file code completion benchmark.',
      },
      {
        title: 'Type-Constrained Code Generation',
        url: 'https://arxiv.org/abs/2504.09246',
        kind: 'paper',
        note: 'Type constraints reduce compile errors.',
      },
    ],
  },
  {
    title: 'CodeHealth predicts AI refactoring success',
    slug: 'codehealth-predicts-refactoring-success',
    summary:
      'File-level code quality (CodeHealth >= 9) is a statistically significant predictor of LLM refactoring success. Medium-sized models see 15-30% break-rate reduction on healthy code.',
    conclusion:
      'Enforce code health through CI: lint, complexity gates, smell detection. The same gates that help human developers also help AI agents.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_30_codehealth_predicts_ai_refactoring_success.md',
    status: 'solid',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['code-quality', 'refactoring', 'ai-agents'],
    tags: ['codehealth', 'smells', 'refactoring'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: [
      'quality-gates-must-cover-smells',
      'static-oracles-catch-what-tests-miss',
      'perplexity-is-not-file-level-ai-friendliness',
    ],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 3,
          note: 'Strongest quantitative link between code quality and AI performance.',
        },
      ],
    },
    problem:
      'The claim that code quality helps AI agents lacked direct quantitative evidence until this paper.',
    whyItMatters:
      'CodeHealth is the root node in ALL five decision trees predicting refactoring failure, with importance 0.572-0.880. The human-calibrated CH=9 threshold also delineates AI risk.',
    evidence: [
      {
        claim: 'Healthy code reduces refactoring break rates by 8-15 pp for medium-sized models.',
        sourceTitles: ['Code for Machines, Not Just Humans'],
        detail:
          'All five medium models show p<0.001. Risk difference ranges from -8.58 pp (Qwen) to -15.12 pp (Gemma).',
      },
      {
        claim: 'Frontier models can compensate but are expensive.',
        sourceTitles: ['Code for Machines, Not Just Humans'],
        detail:
          'Claude achieves 94-96% pass regardless of code health, but Sonnet and Claude samples were smaller.',
      },
      {
        claim: 'AI-assisted code is not inherently worse for maintainability.',
        sourceTitles: ['Echoes of AI'],
        detail:
          'A 151-participant RCT found no systematic maintainability differences in AI-assisted code, with 30.7% median time reduction.',
      },
    ],
    caveats: [
      'Dataset is competitive-programming code (60-120 SLOC), not production repos.',
      'CodeHealth is a proprietary metric; other tools may yield different thresholds.',
      'The study is observational, not interventional.',
    ],
    openQuestions: [
      {
        question: 'Does the CH=9 threshold hold for production multi-file contexts?',
        whyItMatters:
          'Real codebases have different complexity distributions than competitive programming.',
      },
    ],
    sources: [
      {
        title: 'Code for Machines, Not Just Humans',
        url: 'https://arxiv.org/abs/2601.02200',
        kind: 'paper',
        note: 'Primary evidence: CodeHealth predicts AI refactoring success.',
      },
      {
        title: 'Echoes of AI',
        url: 'https://arxiv.org/abs/2507.00788',
        kind: 'paper',
        note: 'RCT: AI-assisted code shows no maintainability difference.',
      },
    ],
  },
  {
    title: 'Perplexity is not file-level AI-friendliness',
    slug: 'perplexity-is-not-file-level-ai-friendliness',
    summary:
      'File-level perplexity has no practically meaningful association with code quality. Token-level PPL correlates with human confusion, but file-level PPL does not predict structural quality.',
    conclusion:
      'Do not use perplexity alone to measure AI-friendliness. Use structural code quality metrics: complexity, nesting, smell detectors.',
    articlePath:
      'presentations/write-code-ai-agents-love/research/insights/INSIGHT_31_perplexity_is_not_file_level_ai_friendliness.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'research',
    publishedAt: '2026-05-23',
    topics: ['code-quality', 'perplexity', 'ai-agents'],
    tags: ['perplexity', 'metrics', 'code-quality'],
    usedInPosts: ['write-code-ai-agents-love'],
    relatedSlugs: ['codehealth-predicts-refactoring-success', 'quality-gates-must-cover-smells'],
    graph: {
      edges: [
        {
          targetType: 'blog-post',
          targetSlug: 'write-code-ai-agents-love',
          relation: 'packs-into',
          strength: 2,
          note: 'Prevents the article from recommending PPL as a quality proxy.',
        },
      ],
    },
    problem:
      'Perplexity is sometimes proposed as a measure of code AI-friendliness. At the file level, it does not work.',
    whyItMatters:
      'Cliff delta ranges from -0.054 to +0.136 across models (negligible). Direction is inconsistent: some models show higher PPL for healthy code.',
    evidence: [
      {
        claim: 'File-level PPL shows negligible and inconsistent association with CodeHealth.',
        sourceTitles: ['Code for Machines, Not Just Humans'],
        detail:
          'All five models show negligible Cliff delta. Direction varies: Gemma/GPT show higher PPL for healthy code, GLM/Qwen show lower.',
      },
      {
        claim: 'Token-level PPL correlates with human confusion (EEG).',
        sourceTitles: ['How do Humans and LLMs Process Confusing Code?'],
        detail:
          'PPL spikes correlate with late frontal positivity EEG component at atoms of confusion. Same metric, different scale, different answer.',
      },
    ],
    caveats: [
      'Token-level PPL is still useful for identifying confusing code constructs.',
      'Different aggregation methods (variance, max) were not tested.',
      'Results are from Python competitive-programming files.',
    ],
    openQuestions: [],
    sources: [
      {
        title: 'Code for Machines, Not Just Humans',
        url: 'https://arxiv.org/abs/2601.02200',
        kind: 'paper',
        note: 'Negative result: PPL vs CodeHealth at file level.',
      },
      {
        title: 'How do Humans and LLMs Process Confusing Code?',
        url: 'https://arxiv.org/abs/2508.18547',
        kind: 'paper',
        note: 'Positive result: PPL correlates with EEG confusion at token level.',
      },
    ],
  },
  {
    title: 'Voice-agent latency budget is the product',
    slug: 'voice-agent-latency-budget-is-product',
    summary:
      'A real-time voice agent is judged by the whole path from user intent to audible behavior, not by one model benchmark.',
    conclusion:
      'Instrument capture, endpointing, STT, LLM, TTS, transport, and playback separately; optimize the full conversational budget.',
    articlePath:
      'presentations/voice-agents/research/drafts/voice-agent-latency-budget-is-product.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'latency', 'observability'],
    tags: ['voice-agents', 'latency-budget', 'realtime'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-endpointing-is-turn-taking',
      'streaming-stt-is-not-batch-stt',
      'tts-latency-is-architecture',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-endpointing-is-turn-taking',
          relation: 'depends-on',
          strength: 3,
          note: 'Endpointing is often the largest controllable latency component.',
        },
        {
          targetType: 'insight',
          targetSlug: 'streaming-stt-is-not-batch-stt',
          relation: 'depends-on',
          strength: 3,
          note: 'STT must be measured by live finalization behavior, not batch WER alone.',
        },
        {
          targetType: 'insight',
          targetSlug: 'tts-latency-is-architecture',
          relation: 'depends-on',
          strength: 3,
          note: 'TTS first-audio latency and streaming shape are part of the same budget.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This is the core frame for the voice-agent talk.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'voice-agents-article-draft',
          relation: 'packs-into',
          strength: 3,
          note: 'This should become the article opening model.',
        },
      ],
    },
    problem:
      'Voice-agent discussions collapse many latency concepts into one word, hiding whether the delay comes from endpointing, STT, LLM, TTS, transport, or playback.',
    whyItMatters:
      'Users experience one conversational delay. Optimizing a single model benchmark can leave the product feeling slow or interruptive.',
    evidence: [
      {
        claim: 'Moonshine v2 reports much lower live response latency than Whisper on Apple M3.',
        sourceTitles: ['Moonshine v2', 'Voice agents latency insight'],
        detail:
          'Moonshine v2 Table 2 reports 50 ms, 148 ms, and 258 ms for Tiny, Small, and Medium, versus 289 ms, 1,940 ms, and 11,286 ms for Whisper Tiny, Small, and Large v3.',
      },
      {
        claim: 'Fish Audio S2 reports explicit TTS TTFA and RTF numbers.',
        sourceTitles: ['Fish Audio S2', 'Voice agents TTS insight'],
        detail:
          'The Fish Audio S2 report states RTF 0.195 and time-to-first-audio as low as 100 ms on H200 production serving.',
      },
      {
        claim: 'OpenAI exposes turn detection delay as a first-class Realtime API setting.',
        sourceTitles: ['OpenAI Realtime API reference'],
        detail:
          'The Realtime reference includes server VAD silence duration, prefix padding, interruption behavior, and semantic VAD eagerness controls.',
      },
    ],
    caveats: [
      'The copied numbers are not all measured in the same environment.',
      'Latency budgets should be re-measured on the actual Jarvis stack.',
      'Human turn-taking baselines are useful context, not a universal SLA.',
    ],
    openQuestions: [
      {
        question: 'What is the measured Jarvis p50/p95 waterfall from mic to playback?',
        whyItMatters:
          'The talk needs at least one local trace to make the latency argument concrete.',
      },
    ],
    sources: [
      {
        title: 'Voice agents latency insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_01_latency_budget_is_the_product.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_01_latency_budget_is_the_product.md',
        note: 'Canonical long-form note with source tables and chart sketches.',
      },
      {
        title: 'Moonshine v2',
        url: 'https://arxiv.org/abs/2602.12241',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/moonshine-v2-2602.12241.txt',
        note: 'Primary live ASR latency numbers.',
      },
      {
        title: 'Fish Audio S2',
        url: 'https://arxiv.org/abs/2603.08823',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/fish-audio-s2-2603.08823.txt',
        note: 'Primary TTS TTFA and RTF numbers.',
      },
      {
        title: 'OpenAI Realtime API reference',
        url: 'https://developers.openai.com/api/reference/resources/realtime',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/openai-realtime-api-reference.html',
        note: 'Turn detection knobs and defaults.',
      },
    ],
  },
  {
    title: 'Endpointing is turn-taking',
    slug: 'voice-agent-endpointing-is-turn-taking',
    summary:
      'VAD answers whether speech is present; endpointing and semantic EOU decide whether the agent is allowed to talk.',
    conclusion:
      'Treat VAD, endpointing, semantic EOU, and barge-in as separate layers with separate metrics.',
    articlePath: 'presentations/voice-agents/research/drafts/endpointing-is-turn-taking.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'vad', 'turn-taking'],
    tags: ['endpointing', 'vad', 'semantic-vad'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-latency-budget-is-product',
      'barge-in-is-the-real-system-test',
      'voice-agent-eval-needs-multiple-metrics',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'supports',
          strength: 3,
          note: 'Endpointing explains why low model latency can still feel slow.',
        },
        {
          targetType: 'insight',
          targetSlug: 'barge-in-is-the-real-system-test',
          relation: 'supports',
          strength: 3,
          note: 'Interruption is a turn-taking problem during assistant speech.',
        },
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-eval-needs-multiple-metrics',
          relation: 'supports',
          strength: 3,
          note: 'Turn-taking needs false EOT, missed EOT, and interruption metrics.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This belongs in the VAD/turn-taking section.',
        },
      ],
    },
    problem:
      'Simple voice agents often use a silence timer as the conversation policy, which causes either dead air or interruptions.',
    whyItMatters:
      'The user judges the agent by whether it speaks at the right time, not by whether the VAD classified frames correctly.',
    evidence: [
      {
        claim: 'Silero is much stronger than WebRTC VAD on multi-domain VAD metrics.',
        sourceTitles: ['Silero VAD quality metrics'],
        detail:
          'The local notes and Silero wiki compare WebRTC around 0.73 ROC-AUC with Silero v5/v6 around 0.96-0.97 in the summarized multi-domain benchmark.',
      },
      {
        claim: 'OpenAI separates silence VAD from semantic VAD.',
        sourceTitles: ['OpenAI Realtime API reference'],
        detail:
          'The Realtime API exposes server_vad and semantic_vad with different knobs: threshold/silence versus eagerness/timeouts.',
      },
      {
        claim: 'LiveKit, Pipecat, and Deepgram expose learned or conversational turn logic.',
        sourceTitles: ['LiveKit turns overview', 'Pipecat Smart Turn', 'Deepgram Flux'],
        detail:
          'These systems layer endpointing or semantic turn detection on top of raw acoustic VAD.',
      },
    ],
    caveats: [
      'VAD quality is not the same as turn-taking quality.',
      'Provider EOT claims are not directly comparable.',
      'Semantic EOU can reduce interruptions while adding latency or model errors.',
    ],
    openQuestions: [
      {
        question: 'Which endpointing mode should Jarvis use for live stage reliability?',
        whyItMatters: 'A talk demo has different risk tolerance than a product support agent.',
      },
    ],
    sources: [
      {
        title: 'Voice agents endpointing insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_02_endpointing_is_turn_taking.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_02_endpointing_is_turn_taking.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'Silero VAD quality metrics',
        url: 'https://github.com/snakers4/silero-vad/wiki/Quality-Metrics',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/silero-vad-quality-metrics.html',
        note: 'VAD benchmark comparison.',
      },
      {
        title: 'LiveKit turns overview',
        url: 'https://docs.livekit.io/agents/logic/turns/',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/livekit-turns.html',
        note: 'Turn detection modes.',
      },
      {
        title: 'Pipecat Smart Turn',
        url: 'https://docs.pipecat.ai/server/utilities/turn-detection/smart-turn-overview',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/pipecat-smart-turn.html',
        note: 'Semantic turn-completion model.',
      },
      {
        title: 'Deepgram Flux',
        url: 'https://developers.deepgram.com/docs/flux/quickstart',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/deepgram-flux-quickstart.html',
        note: 'Conversational STT and end-of-turn events.',
      },
    ],
  },
  {
    title: 'Streaming STT is not batch STT',
    slug: 'streaming-stt-is-not-batch-stt',
    summary:
      'WER is necessary but insufficient for voice agents; live systems need finalization latency, partial stability, EOT quality, and tails.',
    conclusion:
      'Pick STT by conversation behavior and domain accuracy, not only by clean benchmark rank.',
    articlePath: 'presentations/voice-agents/research/drafts/streaming-stt-is-not-batch-stt.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'stt', 'benchmarks'],
    tags: ['stt', 'streaming', 'wer'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-latency-budget-is-product',
      'voice-agent-eval-needs-multiple-metrics',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'supports',
          strength: 3,
          note: 'STT finalization is one stage in the full voice budget.',
        },
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-eval-needs-multiple-metrics',
          relation: 'supports',
          strength: 3,
          note: 'STT needs live metrics beyond WER.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This strengthens the STT benchmark slide.',
        },
      ],
    },
    problem:
      'Batch ASR benchmarks reward transcript accuracy and throughput, but voice agents need stable text early enough to drive turn-taking and response generation.',
    whyItMatters:
      'A low-WER model can still be a poor agent component if it finalizes too late or rewrites partials aggressively.',
    evidence: [
      {
        claim: 'Open ASR Leaderboard reports WER and RTFx, not full turn behavior.',
        sourceTitles: ['Open ASR Leaderboard'],
        detail:
          'The leaderboard standardizes average WER and inverse real-time factor across many ASR systems on A100 hardware.',
      },
      {
        claim: 'Moonshine v2 measures response latency closer to live use.',
        sourceTitles: ['Moonshine v2'],
        detail:
          'The paper defines response latency as the delay between VAD end-of-speech detection and transcript return.',
      },
    ],
    caveats: [
      'Open ASR RTFx is throughput, not EOT latency.',
      'Moonshine v2 is English-focused in the paper.',
      'Provider STT latency should be measured from the client environment.',
    ],
    openQuestions: [
      {
        question: 'How unstable are partial transcripts in the current Jarvis STT path?',
        whyItMatters: 'Partial churn determines whether speculative LLM work is safe.',
      },
    ],
    sources: [
      {
        title: 'Voice agents STT insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_03_streaming_stt_is_not_batch_stt.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_03_streaming_stt_is_not_batch_stt.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'Open ASR Leaderboard',
        url: 'https://arxiv.org/abs/2510.06961',
        kind: 'paper',
        localRef:
          'presentations/voice-agents/research/paper-text/open-asr-leaderboard-2510.06961.txt',
        note: 'Standardized WER/RTFx benchmark.',
      },
      {
        title: 'Whisper paper',
        url: 'https://arxiv.org/abs/2212.04356',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/whisper-2212.04356.txt',
        note: 'Baseline ASR model.',
      },
    ],
  },
  {
    title: 'TTS latency is architecture',
    slug: 'tts-latency-is-architecture',
    summary:
      'Voice-agent TTS should be chosen by TTFA, streaming shape, RTF headroom, interruption behavior, and quality together.',
    conclusion:
      'A beautiful voice is not enough; the TTS serving path must start, stream, and stop like an interactive component.',
    articlePath: 'presentations/voice-agents/research/drafts/tts-latency-is-architecture.md',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'tts', 'latency'],
    tags: ['tts', 'ttfa', 'rtf'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-latency-budget-is-product',
      'barge-in-is-the-real-system-test',
      'voice-agent-eval-needs-multiple-metrics',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'supports',
          strength: 3,
          note: 'TTFA and RTF are part of the full user-perceived budget.',
        },
        {
          targetType: 'insight',
          targetSlug: 'barge-in-is-the-real-system-test',
          relation: 'supports',
          strength: 2,
          note: 'TTS streams must be cancellable for interruption.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This strengthens the TTS benchmark slide.',
        },
      ],
    },
    problem:
      'TTS comparisons often focus on samples and MOS-like quality, while real-time agents need playable audio quickly and cancellably.',
    whyItMatters:
      'Late or uncancellable TTS makes an otherwise smart voice agent feel slow, rude, or broken.',
    evidence: [
      {
        claim: 'F5-TTS exposes a quality/speed tradeoff through NFE.',
        sourceTitles: ['F5-TTS'],
        detail:
          'The paper reports 16 NFE Euler at WER 2.53, UTMOS 3.88, RTF 0.15 and 32 NFE Euler at WER 2.42, UTMOS 3.90, RTF 0.31.',
      },
      {
        claim: 'Fish Audio S2 reports production TTFA and RTF.',
        sourceTitles: ['Fish Audio S2'],
        detail: 'Fish Audio S2 reports RTF 0.195 and TTFA as low as 100 ms on H200 serving.',
      },
      {
        claim: 'StyleTTS 2 provides a strong quality and speed ancestor for Kokoro-like systems.',
        sourceTitles: ['StyleTTS 2'],
        detail:
          'StyleTTS 2 reports CMOS +0.28 over LJSpeech ground truth and RTF 0.0185 in the copied table.',
      },
    ],
    caveats: [
      'StyleTTS 2 metrics are not direct Kokoro metrics.',
      'Fish Audio S2 data is H200 production-serving data.',
      'RTF does not equal TTFA.',
    ],
    openQuestions: [
      {
        question: 'What are Kokoro TTFA and cancellation latency in the local Jarvis setup?',
        whyItMatters: 'Kokoro is the practical demo candidate, so local measurements matter.',
      },
    ],
    sources: [
      {
        title: 'Voice agents TTS insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_04_tts_latency_is_architecture.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_04_tts_latency_is_architecture.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'F5-TTS',
        url: 'https://arxiv.org/abs/2410.06885',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/f5-tts-2410.06885.txt',
        note: 'Flow matching TTS benchmark table.',
      },
      {
        title: 'StyleTTS 2',
        url: 'https://arxiv.org/abs/2306.07691',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/styletts2-2306.07691.txt',
        note: 'Quality and speed lineage.',
      },
      {
        title: 'Kokoro-82M model card',
        url: 'https://huggingface.co/hexgrad/Kokoro-82M',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/kokoro-82m-model-card.html',
        note: 'Small local TTS candidate.',
      },
    ],
  },
  {
    title: 'Transport is media correctness',
    slug: 'transport-is-media-correctness',
    summary:
      'WebRTC wins for browser/mobile voice because it owns media behavior, not because every demo needs lower transport latency.',
    conclusion:
      'Use WebRTC by default for client voice; reserve WebSocket for server streams, telephony, or controlled prototypes.',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'webrtc', 'transport'],
    tags: ['webrtc', 'websocket', 'media'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: ['barge-in-is-the-real-system-test', 'voice-agent-latency-budget-is-product'],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'barge-in-is-the-real-system-test',
          relation: 'supports',
          strength: 3,
          note: 'Barge-in depends on media timing, echo cancellation, and playout control.',
        },
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'supports',
          strength: 2,
          note: 'Transport is one segment of the user-perceived latency waterfall.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This belongs in the real-time transport section.',
        },
      ],
    },
    problem:
      'A WebSocket audio demo can work while hiding media problems that appear on real browser/mobile networks.',
    whyItMatters:
      'Production voice needs AEC, jitter handling, timestamps, NAT traversal, playout, and cancellation state.',
    evidence: [
      {
        claim:
          'OpenAI recommends WebRTC for browser/mobile and WebSocket for server-side integrations.',
        sourceTitles: ['OpenAI Realtime WebRTC docs', 'OpenAI Realtime WebSocket docs'],
        detail:
          'The official Realtime docs separate client-side WebRTC from server-side WebSocket use cases.',
      },
      {
        claim: 'WebSocket frame overhead is not the main transport problem.',
        sourceTitles: ['Local transport deep dive'],
        detail:
          'The local transport note estimates 2-14 bytes per frame, about 0.2-1.5% for a 960-byte 30 ms 16 kHz int16 audio chunk.',
      },
    ],
    caveats: [
      'WebRTC is not magic; TURN placement and app cancellation still matter.',
      'WebSocket is valid for many server-side and controlled-network scenarios.',
      'Transport does not remove endpointing/STT/LLM/TTS latency.',
    ],
    openQuestions: [
      {
        question:
          'Should Jarvis default to WebRTC for the talk demo or keep WebSocket for simplicity?',
        whyItMatters: 'Stage reliability may favor the path that is simplest to test end to end.',
      },
    ],
    sources: [
      {
        title: 'Voice agents transport insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_05_transport_is_media_correctness.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_05_transport_is_media_correctness.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'OpenAI Realtime WebRTC docs',
        url: 'https://developers.openai.com/api/docs/guides/realtime-webrtc',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/openai-realtime-webrtc.html',
        note: 'Browser/mobile transport guidance.',
      },
      {
        title: 'OpenAI Realtime WebSocket docs',
        url: 'https://developers.openai.com/api/docs/guides/realtime-websocket',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/openai-realtime-websocket.html',
        note: 'Server-side transport guidance.',
      },
      {
        title: 'Local transport deep dive',
        url: 'presentations/voice-agents/TRANSPORT-DEEP-DIVE.md',
        kind: 'local-case-study',
        localRef: 'presentations/voice-agents/TRANSPORT-DEEP-DIVE.md',
        note: 'Existing transport research.',
      },
    ],
  },
  {
    title: 'Barge-in is the real system test',
    slug: 'barge-in-is-the-real-system-test',
    summary:
      'A voice agent is not conversational until the user can interrupt it and the system stops, cancels, and preserves state correctly.',
    conclusion: 'Test interruption as an end-to-end media and state problem, not a VAD checkbox.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'barge-in', 'conversation'],
    tags: ['barge-in', 'interruption', 'aec'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-endpointing-is-turn-taking',
      'transport-is-media-correctness',
      'tts-latency-is-architecture',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-endpointing-is-turn-taking',
          relation: 'depends-on',
          strength: 3,
          note: 'Interruption is turn-taking during assistant speech.',
        },
        {
          targetType: 'insight',
          targetSlug: 'transport-is-media-correctness',
          relation: 'depends-on',
          strength: 3,
          note: 'Echo cancellation and media timing make interruption detectable.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This is the systems test that makes the demo credible.',
        },
      ],
    },
    problem:
      'Many voice demos only prove single-turn prompt/response, not whether the user can stop the agent or correct it mid-sentence.',
    whyItMatters:
      'Interruption failure makes a voice agent feel non-conversational even when STT, LLM, and TTS all work individually.',
    evidence: [
      {
        claim: 'Realtime APIs expose interruption behavior as part of turn detection.',
        sourceTitles: ['OpenAI Realtime API reference'],
        detail:
          'OpenAI Realtime turn detection includes fields such as interruption behavior alongside VAD configuration.',
      },
      {
        claim: 'Transport and AEC affect whether the agent hears itself.',
        sourceTitles: ['Local transport deep dive', 'LiveKit transport docs'],
        detail:
          'The local transport research highlights WebRTC echo cancellation and media timing as a decisive advantage for browser voice.',
      },
    ],
    caveats: [
      'There are fewer open barge-in benchmarks than ASR benchmarks.',
      'AEC does not solve semantic backchannel classification.',
      'Provider cancellation still needs app-side state handling.',
    ],
    openQuestions: [
      {
        question: 'What is Jarvis interruption stop latency at speaker volume in a real room?',
        whyItMatters:
          'The talk demo likely runs through speakers, where echo and false VAD matter.',
      },
    ],
    sources: [
      {
        title: 'Voice agents barge-in insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_06_barge_in_is_the_real_system_test.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_06_barge_in_is_the_real_system_test.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'LiveKit transport docs',
        url: 'https://docs.livekit.io/transport/',
        kind: 'official-doc',
        localRef: 'presentations/voice-agents/research/articles/livekit-transport.html',
        note: 'WebRTC production substrate.',
      },
    ],
  },
  {
    title: 'Native speech models change the boundary',
    slug: 'native-speech-models-change-the-boundary',
    summary:
      'Native speech-to-speech models attack the STT-LLM-TTS cascade, but cascades remain easier to debug, evaluate, and control.',
    conclusion:
      'Use native speech when latency, prosody, overlap, or duplex behavior justify the loss of component transparency.',
    status: 'working',
    confidence: 'medium',
    sourceType: 'research',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'native-speech', 'architecture'],
    tags: ['speech-to-speech', 'moshi', 'qwen-omni'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: ['voice-agent-latency-budget-is-product', 'barge-in-is-the-real-system-test'],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'extends',
          strength: 2,
          note: 'Native speech models try to remove cascade latency boundaries.',
        },
        {
          targetType: 'insight',
          targetSlug: 'barge-in-is-the-real-system-test',
          relation: 'extends',
          strength: 2,
          note: 'Full-duplex native models directly target overlap and interruption.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 2,
          note: 'This belongs in the future-facing section.',
        },
      ],
    },
    problem:
      'Cascaded systems discard prosody and impose hard turn boundaries, but native speech systems can be harder to inspect and operate.',
    whyItMatters:
      'The architectural boundary determines which failures are observable, controllable, and optimizable.',
    evidence: [
      {
        claim:
          'Moshi explicitly targets cascade latency, text bottleneck, and turn-based limitations.',
        sourceTitles: ['Moshi'],
        detail:
          'The paper reports 160 ms theoretical latency, 200 ms practical latency, 12.5 Hz Mimi codec, and full-duplex multi-stream modeling.',
      },
      {
        claim:
          'Qwen2.5-Omni uses a Thinker-Talker architecture for multimodal reasoning and speech output.',
        sourceTitles: ['Qwen2.5-Omni'],
        detail:
          'The paper describes Talker producing audio tokens from Thinker representations with streaming audio decoding.',
      },
    ],
    caveats: [
      'Native speech claims rarely include full product evaluation.',
      'Tool calls, moderation, and logs are simpler in cascaded text-centered systems.',
      'Open-source native systems often need custom serving and eval harnesses.',
    ],
    openQuestions: [
      {
        question: 'Which Jarvis interaction actually needs native speech rather than a cascade?',
        whyItMatters:
          'Native speech complexity is only worth it if the product needs duplex/prosody, not just novelty.',
      },
    ],
    sources: [
      {
        title: 'Voice agents native speech insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_07_native_speech_models_change_the_boundary.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_07_native_speech_models_change_the_boundary.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'Moshi',
        url: 'https://arxiv.org/abs/2410.00037',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/moshi-2410.00037.txt',
        note: 'Full-duplex native speech model.',
      },
      {
        title: 'Qwen2.5-Omni',
        url: 'https://arxiv.org/abs/2503.20215',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/qwen25-omni-2503.20215.txt',
        note: 'Thinker-Talker architecture.',
      },
      {
        title: 'GLM-4-Voice',
        url: 'https://arxiv.org/abs/2412.02612',
        kind: 'paper',
        localRef: 'presentations/voice-agents/research/paper-text/glm-4-voice-2412.02612.txt',
        note: 'End-to-end spoken chatbot architecture.',
      },
    ],
  },
  {
    title: 'Voice-agent eval needs multiple metrics',
    slug: 'voice-agent-eval-needs-multiple-metrics',
    summary:
      'A voice agent must be evaluated across speech accuracy, turn-taking, latency tails, barge-in, transport, cost, and task success.',
    conclusion:
      'Build a trace-based eval harness; no single WER, MOS, RTF, or demo result is enough.',
    status: 'working',
    confidence: 'high',
    sourceType: 'mixed',
    publishedAt: '2026-05-22',
    topics: ['voice-agents', 'evaluation', 'observability'],
    tags: ['evals', 'metrics', 'trace'],
    usedInPosts: ['voice-agents-article-draft'],
    relatedSlugs: [
      'voice-agent-latency-budget-is-product',
      'voice-agent-endpointing-is-turn-taking',
      'streaming-stt-is-not-batch-stt',
      'tts-latency-is-architecture',
    ],
    graph: {
      edges: [
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-latency-budget-is-product',
          relation: 'operationalizes',
          strength: 3,
          note: 'The latency budget becomes useful only when every stage emits trace events.',
        },
        {
          targetType: 'insight',
          targetSlug: 'voice-agent-endpointing-is-turn-taking',
          relation: 'operationalizes',
          strength: 3,
          note: 'False EOT and missed EOT turn endpointing into measurable behavior.',
        },
        {
          targetType: 'blog-post',
          targetSlug: 'voice-agents-article-draft',
          relation: 'packs-into',
          strength: 3,
          note: 'This should be the practical checklist section.',
        },
        {
          targetType: 'presentation',
          targetSlug: 'voice-agents-deck',
          relation: 'packs-into',
          strength: 3,
          note: 'This should become the closing evaluation slide.',
        },
      ],
    },
    problem:
      'Voice-agent benchmarks often optimize visible model metrics while missing the failures users feel: wrong timing, failed interruption, noisy media, and tail latency.',
    whyItMatters:
      'Without a multi-metric harness, teams optimize the component with the easiest benchmark instead of the system bottleneck.',
    evidence: [
      {
        claim: 'STT, TTS, VAD, and transport sources use incompatible metrics.',
        sourceTitles: [
          'Open ASR Leaderboard',
          'F5-TTS',
          'Fish Audio S2',
          'Silero VAD quality metrics',
        ],
        detail:
          'The research spans WER, RTFx, UTMOS, SIM, RTF, TTFA, ROC-AUC, EOT latency, and transport behavior.',
      },
      {
        claim: 'The local notes now define a trace schema for turn-level instrumentation.',
        sourceTitles: ['Voice agents eval insight'],
        detail:
          'The canonical insight proposes timestamps for audio, VAD, endpointing, STT, LLM, TTS, playout, and interruption.',
      },
    ],
    caveats: [
      'The note proposes a harness; it does not yet include measured Jarvis trace data.',
      'Metric weights should depend on product domain.',
      'Human listening tests still matter for voice quality.',
    ],
    openQuestions: [
      {
        question: 'Which 20-50 test turns should become the Jarvis voice-agent regression set?',
        whyItMatters:
          'A small high-signal local eval set would make demo reliability and future posts much stronger.',
      },
    ],
    sources: [
      {
        title: 'Voice agents eval insight',
        url: 'presentations/voice-agents/research/insights/INSIGHT_08_voice_agent_eval_needs_multiple_metrics.md',
        kind: 'local-case-study',
        localRef:
          'presentations/voice-agents/research/insights/INSIGHT_08_voice_agent_eval_needs_multiple_metrics.md',
        note: 'Canonical long-form note.',
      },
      {
        title: 'Open ASR Leaderboard',
        url: 'https://arxiv.org/abs/2510.06961',
        kind: 'paper',
        localRef:
          'presentations/voice-agents/research/paper-text/open-asr-leaderboard-2510.06961.txt',
        note: 'WER/RTFx benchmark model.',
      },
    ],
  },
] as const satisfies readonly Insight[];

export type InsightSlug = (typeof insights)[number]['slug'];
export type BrainGraphDocumentSlug = (typeof brainGraphDocuments)[number]['slug'];

function getGraphTargetKey(targetType: InsightGraphNodeType, targetSlug: string) {
  return `${targetType}:${targetSlug}`;
}

function validateInsightGraph(insight: Insight) {
  const knownTargets = new Set([
    ...insights.map((candidate) => getGraphTargetKey('insight', candidate.slug)),
    ...brainGraphDocuments.map((document) => getGraphTargetKey(document.type, document.slug)),
  ]);

  insight.graph.edges.forEach((edge) => {
    const targetKey = getGraphTargetKey(edge.targetType, edge.targetSlug);

    if (!knownTargets.has(targetKey)) {
      throw new Error(`Unknown graph target for ${insight.slug}: ${targetKey}`);
    }

    if (edge.targetType === 'insight' && edge.targetSlug === insight.slug) {
      throw new Error(`Insight graph edge cannot point to itself: ${insight.slug}`);
    }
  });
}

const insightSections = {
  'agents-run-orient-retrieve-edit-verify': [
    {
      heading: 'The task is not "write code"; the task is repository surgery',
      body: [
        `The first thing this research changed for me is that coding agents should not be evaluated as autocomplete with a bigger prompt. SWE-bench is useful here because the task shape is closer to real work: the model receives an issue, sees a repository snapshot, writes a patch, and then the patch is judged by the repository test suite. That is a different animal from producing a standalone function from a docstring.`,
        `When I compress that into a repo-design rule, I get a loop: orient, retrieve, edit, verify. The agent has to orient itself in the repository, retrieve the relevant neighborhood, make an edit that follows local conventions, then verify that the edit actually works. A codebase that is hard to navigate, hard to search, hard to edit locally, or hard to test will punish the agent at a different point in that loop.`,
      ],
      quote: {
        text: 'real-world software engineering is not as simple',
        sourceTitle: 'SWE-bench',
        note: 'This is the core reason isolated code-generation benchmarks are not enough for the talk.',
      },
    },
    {
      heading: 'Practitioner workflows independently recreate the same loop',
      body: [
        `The practitioner sources are not controlled experiments, but they are valuable because experienced users converge on a similar workflow. Jon Atkinson starts with context gathering, then writes a phased plan, then uses a second agent to critique the plan. Boris Tane separates research, plan annotation, and implementation, and explicitly says the plan artifact survives context compaction. Anthropic's large-codebase guidance also pushes layered context, subagents, hooks, and retrieval rather than a single magic prompt.`,
        `The research implication is that "agent-friendly code" is not just prettier code. It is code surrounded by recoverable orientation artifacts: commands, file layout, tests, generated contracts, source maps, and written decisions. The repo is the agent computer interface. The more the repo can answer "where am I, what matters, what changed, and how do I know," the less the agent has to guess.`,
      ],
    },
  ],
  'recoverable-structure-beats-prompt-volume': [
    {
      heading: 'More context is not the same as better context',
      body: [
        `The strongest version of this insight is not "give the agent less context." The evidence points to something narrower: context has to be recoverable, ranked, and structurally meaningful. CrossCodeEval shows that cross-file context can materially improve repository completion. GraphCodeAgent shows that graph-guided retrieval can beat plain retrieval. The AGENTS.md evaluations show that adding a context file can sometimes reduce cost, but can also add steps, tokens, and noise depending on how it is written.`,
        `So the codebase trick is not to stuff everything into one long instruction file. The trick is to turn important knowledge into surfaces the agent can locate: names, imports, public APIs, generated types, tests, examples, package boundaries, and executable commands. These are better than prose because they are searchable and they participate in the actual build/test loop.`,
      ],
    },
    {
      heading: 'Graph structure keeps showing up',
      body: [
        `The graph-based papers are useful because they give a concrete shape to "structure." RepoGraph models dependencies across line, file, and repository levels. GraphCodeAgent builds requirement and code graphs and gives the agent tools to traverse them. This is not the same as "a giant repository map in the prompt." The important part is that the agent can ask for the next relevant neighborhood instead of passively consuming an enormous blob.`,
        `For a normal product repo, the practical version is mundane: clear import directions, colocated tests, generated clients, project references, package ownership, ADRs near the decisions they explain, and commands that produce deterministic output. The blogpost should argue for this as recoverable structure: context that survives forgetting because the repo can regenerate it.`,
      ],
      quote: {
        text: 'dynamic, on-demand exploration',
        sourceTitle: 'GraphCodeAgent',
        note: 'Good phrase for distinguishing tool-assisted retrieval from pasted context.',
      },
    },
  ],
  'names-are-semantic-infrastructure': [
    {
      heading: 'Names are not cosmetic for code models',
      body: [
        `The naming papers make this one unusually strong. CodeT5 explicitly builds identifier-aware objectives because identifiers carry useful code semantics. "When Names Disappear" separates structural semantics from human-interpretable naming and shows that removing the naming channel hurts intent-level tasks. The naming-affects-LLMs paper pushes the same direction from perturbation studies: LLM behavior changes when names become nonsense, anonymized, or misleading.`,
        `For humans, a bad name is annoying. For an agent, a bad name can become a false retrieval key. If the concept is called "workspace" in the database, "tenant" in the API, "organization" in the UI, and "account" in the tests, the agent has to infer whether these are synonyms or distinct domain objects. Sometimes it will be right. Sometimes it will wire the wrong layer together with great confidence.`,
      ],
      quote: {
        text: 'developer-assigned identifiers',
        sourceTitle: 'CodeT5',
        note: 'The paper treats names as a model-relevant signal, not just a human style preference.',
      },
    },
    {
      heading: 'The real rule is consistency across surfaces',
      body: [
        `I do not think the takeaway is "make every name long." The better rule is vocabulary discipline. Use the same domain nouns across code, tests, docs, route names, API schemas, and examples. Use verbs that tell the truth about side effects. Avoid generic utility folders when the real boundary is a domain capability. Keep exported symbol names stable unless the concept itself changed.`,
        `There is also a negative version of this insight: misleading names are worse than terse names. A short name forces reading. A wrong name supplies a confident lie. Since agents often rely on names to decide what to inspect next, naming debt is retrieval debt.`,
      ],
    },
  ],
  'function-sized-chunks-are-not-necessarily-agent-friendly': [
    {
      heading: 'Small functions and good retrieval units are different ideas',
      body: [
        `This is the insight that prevents the talk from becoming shallow clean-code advice. The chunking paper directly tests retrieval units for code completion and finds that function chunking underperforms declaration, sliding-window, and cAST strategies. That does not mean large functions are good. It means a function body alone is often not the right unit of context for an agent.`,
        `Agents need neighborhoods: imports, types, callers, callees, declarations, examples, tests, and sometimes the surrounding module. A tiny function can be easy to edit but useless to retrieve in isolation. Conversely, a broader chunk can be ugly as software architecture but better as retrieval material. Those are different optimization targets.`,
      ],
      quote: {
        text: 'Function chunking is never Pareto-optimal',
        sourceTitle: 'Chunking for RAG code completion',
        note: 'Useful counterweight to the naive "agents like tiny functions" claim.',
      },
    },
    {
      heading: 'Design for coherent neighborhoods',
      body: [
        `The practical design move is to make meaningful neighborhoods explicit. In a React app, that might be route, component, hook, schema, generated client, and test fixture. In a backend service, it might be handler, service, repository, domain model, migration, and contract tests. The agent should be able to pull the neighborhood without wandering through unrelated folders.`,
        `This also changes how I think about examples. A single perfect function example may be less useful than a small vertical slice showing how the repo expects data to move through layers. The retrieval unit should preserve usage, not just implementation.`,
      ],
    },
  ],
  'boundaries-beat-modularity-as-a-slogan': [
    {
      heading: 'Modularity is too vague to be a useful agent rule',
      body: [
        `The modularity paper is a useful warning. It does not say modular code is bad; it says a measured modularity score did not clearly predict better LLM code-generation performance. That matters because "make it modular" is one of those phrases that sounds technical while hiding the actual mechanism.`,
        `The mechanism I care about is boundary recoverability. Can the agent see the public API of a package? Can it tell which layer is allowed to import which other layer? Can it find the tests for the boundary? Can it know where generated code ends and handwritten code begins? Those questions are more concrete than asking whether code is modular.`,
      ],
      quote: {
        text: 'no clear correlation between code modularity and performance',
        sourceTitle: 'Revisiting Modularity',
        note: 'This keeps the claim honest: boundaries are useful, modularity-as-aesthetic is not enough.',
      },
    },
    {
      heading: 'A boundary should reduce the search space',
      body: [
        `A good boundary tells the agent where to look and where not to look. Package exports, feature folders, dependency rules, schemas, and test commands all help because they constrain the possible edit set. A bad boundary just adds ceremony: many folders, many abstractions, no ownership, no obvious direction of dependency.`,
        `This is why I would rather say "clear boundaries" than "simple architecture." Simple is too subjective. Boundary quality can be inspected: imports point one way, public APIs are small, generated artifacts are isolated, and violations fail loudly.`,
      ],
    },
  ],
  'types-and-sdks-compress-intent': [
    {
      heading: 'Types turn remote behavior into local affordances',
      body: [
        `The evidence for types is stronger than the evidence for SDKs specifically, but the mechanism is the same. CatCoder improves repository-level generation by adding type context. FeatureBench finds that explicit interfaces matter enough to include an ablation without them. Generated SDKs are the practical way to apply this at API boundaries: paths, request shapes, response models, auth assumptions, and pagination stop living only in stringly typed calls.`,
        `A raw fetch call forces the agent to infer the contract from scattered examples. A generated client gives it importable names, request objects, response types, and compiler feedback. The API is no longer an external mystery; it becomes code in the same local reasoning space as the feature being changed.`,
      ],
      quote: {
        text: 'Interface-driven task specification with minimal ambiguity',
        sourceTitle: 'FeatureBench',
        note: 'FeatureBench makes the role of explicit interfaces very visible.',
      },
    },
    {
      heading: 'Generated code is context, but it needs policy',
      body: [
        `The generated-SDK argument gets worse if the generated code is dumped into random folders or edited by hand. The repo needs a policy: where the schema lives, where generation config lives, whether generated output is committed, what command refreshes it, and which files agents are allowed to edit. Without that, generated clients become another source of stale truth.`,
        `The sweet spot for agents is a contract pipeline: schema committed, generator configured, output predictable, examples nearby, and CI failing when the generated code is stale. That gives the agent both the API surface and the repair loop.`,
      ],
      quote: {
        text: 'Generate type-safe TypeScript clients from OpenAPI specifications',
        sourceTitle: 'Orval',
        note: 'Representative of the practical tooling pattern, not unique to Orval.',
      },
    },
  ],
  'executable-architecture-beats-prose': [
    {
      heading: 'Architecture prose is weak feedback',
      body: [
        `The custom-lint insight is partly research, partly practice. The research says agents can be helped by better repository interfaces and can be hurt by noisy instruction files. The tooling ecosystem shows a mature way to turn local policy into executable feedback: ESLint custom rules, typescript-eslint typed rules, Semgrep, ast-grep, Nx module boundaries, dependency-cruiser, and local systems like polint.`,
        `The core idea is simple: if a rule matters and can be checked mechanically, it should fail in a way the agent can inspect. "Do not import persistence from UI" is a request. A lint diagnostic on the exact import is a repairable fact.`,
      ],
      quote: {
        text: 'You can create custom rules to use with ESLint.',
        sourceTitle: 'ESLint custom rules',
        note: 'The mainstream tooling path exists before we reach for custom frameworks.',
      },
    },
    {
      heading: 'polint is the local case study, not the sales pitch',
      body: [
        `polint fits this note because it makes the repo own the rules as code. That matters when a policy is too specific for YAML patterns: cross-file evidence, generated-contract awareness, baseline adoption, domain-specific paths, or test-evidence heuristics. The plint case study is useful because it shows the pattern being used for backend architecture guardrails rather than abstract style preferences.`,
        `The risk is obvious: bad rules create local bureaucracy and agents can learn to satisfy the diagnostic rather than preserve the design. So the bar for custom rules should be high. Use stock lint first. Add custom rules when the policy is important, mechanically detectable, and likely to prevent repeated agent mistakes.`,
      ],
      quote: {
        text: 'rules you own',
        sourceTitle: 'polint README',
        note: 'This phrase captures the repo-local policy idea without overselling the tool.',
      },
    },
  ],
  'static-diagnostics-are-agent-interfaces': [
    {
      heading: 'A diagnostic is a structured prompt with evidence',
      body: [
        `The useful version of static analysis for agents is not a wall of lint text. It is a structured repair object: rule ID, severity, file, span, matched evidence, expected surface, related files, and machine-readable output. That object is a better agent interface than prose because it anchors the repair to one place in the codebase.`,
        `ToolGen gives the mechanism from the generation side: when models can access available symbols and members, dependency coverage and static validity improve sharply. Type-Constrained Code Generation gives the type side: generated TypeScript failures are overwhelmingly type-check failures. Together they imply that static feedback should be designed as part of the agent loop, not as an afterthought.`,
      ],
    },
    {
      heading: 'Repairability is the bar',
      body: [
        `A weak diagnostic says "do not use raw API calls." A repairable diagnostic says which call was found, which generated client should be used, where the schema lives, and which example shows the approved path. This is where JSON/SARIF and stable rule IDs become more than CI integrations: they let agents filter, focus, rerun, and verify.`,
        `The caveat is that diagnostics can also cause churn. The note should distinguish exact syntax facts from heuristic warnings. If the analyzer is only guessing that a branch lacks test evidence, the diagnostic should say that. Agents optimize against the feedback they receive; the feedback needs to be honest about precision.`,
      ],
    },
  ],
  'static-oracles-catch-what-tests-miss': [
    {
      heading: 'Passing behavior can hide structural failure',
      body: [
        `Needle in the Repo is the cleanest warning: some outputs pass behavior checks but fail maintainability structure. CODETASTE makes the refactoring version even sharper. GPT-5.2 open direct mode can pass tests while almost completely missing the intended refactor alignment. That is exactly the failure mode static oracles are meant to expose.`,
        `A static oracle can check that an old API disappeared, a new generated client is used, a forbidden dependency edge is gone, or a route now carries required middleware. None of those is a replacement for tests. They are checks for structural intent that tests may not encode.`,
      ],
    },
    {
      heading: 'The agent sees the oracle it can run',
      body: [
        `Constraint Decay shows that production-like backend constraints are not small details. Architecture, database, and ORM choices impose measurable load. If those constraints only live in a README, the agent has to infer them while also implementing the feature. If they are encoded as static checks, they enter the same edit-check-repair loop as tests.`,
        `The blog should use this as the hard-data justification for custom lint rules. The point is not "more rules." The point is making structural success visible: dependency direction, migration completeness, generated-code policy, security middleware, and test-evidence conventions.`,
      ],
    },
  ],
  'static-fact-models-make-rules-agent-usable': [
    {
      heading: 'Syntax facts are the first rung, not the ladder',
      body: [
        `The static-analysis thread gets shallow if it stops at AST matching. CrossCodeEval, CatCoder, ToolGen, A3-CodGen, CodeGRAG, InlineCoder, and graph-code papers all point toward relationships: imports, definitions, references, public APIs, types, callers, callees, control flow, data flow, tests, and coverage. Agents fail when those relationships are hidden or too expensive to recover.`,
        `That means the useful product abstraction is a fact model. A rule that bans raw internal API calls may need string literals today, resolved imports tomorrow, and type facts once generated SDKs become the approved path. A rule that checks context propagation needs call graph and dataflow, not just a regex.`,
      ],
    },
    {
      heading: 'Expose scoped fact views, not raw parser internals',
      body: [
        `The design lesson from the local polint/exlint line of work is that rules should ask for the facts they need explicitly. A function signature that requests imports, literals, symbols, or future call-graph facts is easier to plan, cache, explain, and validate than a broad context object that can secretly read anything.`,
        `For the article, this probably compresses into one visual: a static-analysis ladder from syntax to module graph to symbols to types to CFG/dataflow/call graph to test evidence. The caveat is important: more facts are not always better. A3-CodGen and chunking results both warn against dumping more context. The point is selective, typed, scoped fact access.`,
      ],
    },
  ],
  'agents-md-should-be-an-index': [
    {
      heading: 'The instruction file is configuration, not documentation',
      body: [
        `The AGENTS.md evidence is mixed in a useful way. One paper finds lower median runtime and output token usage when a root AGENTS.md is present. Another evaluation finds that context files can increase steps and cost, and that LLM-generated files can slightly reduce success. The right conclusion is not "always add AGENTS.md" or "never add it." The conclusion is that persistent instructions are part of the agent interface and can be good or bad configuration.`,
        `That pushes me toward a narrow role: AGENTS.md should be an index and operating contract. Commands. Non-negotiable constraints. Generated-code policy. Where to find deeper docs. What not to touch. It should not be an architecture novel, because novels go stale and consume the same context budget the agent needs for the actual code.`,
      ],
      quote: {
        text: 'READMEs for agents',
        sourceTitle: 'AGENTS.md impact',
        note: 'Good shorthand, but the note should stress "README" does not mean dumping everything.',
      },
    },
    {
      heading: 'The file should point to executable truth',
      body: [
        `The best AGENTS.md entries are command-shaped and boundary-shaped. "Run pnpm build" is better than "make sure it works." "Do not edit generated clients; regenerate them with pnpm generate-api" is better than a paragraph about API hygiene. "Use app/brain/AGENTS.md for Brain notes" is better than repeating the same style guide everywhere.`,
        `This also makes AGENTS.md a maintenance liability. If a command changes, the file must change. If the file says one thing and package.json says another, the agent will pick one. The repo should treat agent instructions like any other high-leverage config: short, reviewed, and tested where possible.`,
      ],
    },
  ],
  'tests-are-context-not-just-verification': [
    {
      heading: 'Tests tell the agent what behavior exists',
      body: [
        `The testing evidence is subtle. Rethinking agent-generated tests suggests that simply asking agents to write more tests is not a magic lever; some high-performing agents wrote few tests, and prompting more tests increased cost without improving resolution in that setup. FeatureBench points in the other direction for visible real unit tests: when tests expose expected behavior, agent success improves substantially.`,
        `The distinction is important. Durable repository tests are context. They show setup, interfaces, edge cases, fixtures, naming, and expected behavior. Agent-written tests during a task can be useful probes, but they are not the same as a maintained behavioral contract.`,
      ],
      quote: {
        text: 'high-quality unit test',
        sourceTitle: 'FeatureBench',
        note: 'The paper uses visible tests as a strong signal for agent performance.',
      },
    },
    {
      heading: 'The agent needs fast truth, not theatrical coverage',
      body: [
        `For repo design, the target is a small set of trustworthy checks per area. A command that runs the relevant test slice is often more useful than a huge full-suite command the agent cannot afford to run repeatedly. Test names should describe behavior. Fixtures should be readable. Failure output should point at the contract that broke.`,
        `This is also where pass-to-pass tests matter conceptually. The agent should know not only how to make the new behavior pass, but what must keep working. Tests become a map of negative space: here are the things this edit must not break.`,
      ],
    },
  ],
  'monorepo-is-context-database-if-it-has-boundaries': [
    {
      heading: 'The monorepo argument is atomic context',
      body: [
        `I do not think the research proves "monorepos make agents better." That direct causal paper is missing. The better, defensible claim is that monorepos can give agents atomic context when the app, docs, API schemas, generated clients, infra, migrations, tests, runbooks, and policies change together. The agent is not forced to guess across repository boundaries or stale wikis.`,
        `Google's monorepo paper and the Code Simplicity article are useful because they separate the monorepo from the slogan. The value is not the folder count. It is common source of truth, atomic commits, one version, one hierarchy, and tooling that keeps the large repo workable.`,
      ],
      quote: {
        text: 'common source of truth',
        sourceTitle: 'Google monorepo paper',
        note: 'This is the phrase that maps most directly onto agent context.',
      },
    },
    {
      heading: 'A bad monorepo is just a bigger confusion surface',
      body: [
        `The monorepo only helps agents if boundaries are explicit. Otherwise the search space gets larger, the build gets slower, and ownership gets fuzzier. An agent-friendly monorepo needs affected-test tooling, package boundaries, generated-code rules, sparse enough local commands, and docs that live close to the code they describe.`,
        `The version I would present is: put things together when they change together, and enforce the boundaries that make "together" understandable. For agents, one commit that contains the whole truth is powerful. One repo that contains every unrelated thing without ownership is not.`,
      ],
    },
  ],
  'agent-instructions-are-config': [
    {
      heading: 'Your agent file is not a README',
      body: [
        `The research shows AGENTS.md has measurable but mixed effects. When files contain exact commands, architecture summaries, and hard constraints, they reduce runtime and token consumption. When they become stale, long, or aspirational, they increase cost without improving patches. The file is operational configuration, not documentation.`,
        `The practical rule: include commands, constraints, gotchas, and verification expectations. Exclude changelogs, generic advice, file trees, and aspirational rules the repo does not follow.`,
      ],
    },
  ],
  'reproducible-setup-is-agent-infrastructure': [
    {
      heading: 'If a new laptop cannot run it, neither can a fresh agent',
      body: [
        `Installamatic finds a 28.8% average installation rate for Python projects, even when agents find relevant docs. SetupBench isolates setup as a direct benchmark problem and shows even strong scaffolds top out around 62% success. The bottleneck is not the agent. It is the implicit setup knowledge.`,
        `Agent-friendly repos need pinned lockfiles, one-command install, one-command test, explicit env vars, and no hidden manual steps. Container or devcontainer support helps when setup is inherently complex.`,
      ],
    },
  ],
  'simplicity-beats-agent-theater': [
    {
      heading: 'Fix the repo before adding more agents',
      body: [
        `Agentless demonstrates that a simple localize-repair-validate workflow can be competitive with more elaborate agent systems. ContextBench finds sophisticated scaffolding yields marginal gains. The lesson is not anti-tooling. The lesson is that repo quality is the foundation.`,
        `Before adding orchestration, ensure clear task contracts, reliable tests, searchable structure, precise instructions, and reproducible setup. Then use orchestration for tasks that genuinely need parallel exploration.`,
      ],
    },
  ],
  'context-should-be-layered': [
    {
      heading: 'Default context should orient; on-demand context should explain',
      body: [
        `The best agent context follows a layered model: a small hot path loaded by default plus deeper cold context fetched when relevant. Codified Context describes this pattern for a large C# system. Cursor, GitHub Copilot, and Anthropic all support scoped, path-level instructions.`,
        `The practical layering: root file for durable invariants and commands, subdirectory files for local conventions, docs/architecture for system design, generated repo maps for dependency graphs, and task specs for temporary goal-specific context.`,
      ],
    },
  ],
  'long-context-still-needs-structure': [
    {
      heading: 'A million-token window is not a map',
      body: [
        `Lost in the Middle shows models can underuse relevant information depending on where it appears in long context. ContextBench shows agents often retrieve too much context and still fail to use relevant material. Larger windows do not eliminate the need for retrieval, maps, and scoped documentation.`,
        `The repo should support progressive disclosure: root maps, scoped docs, generated symbol maps, canonical examples, searchable docs, exact commands, and focused task specs.`,
      ],
    },
  ],
  'agent-friendly-repos-support-noop': [
    {
      heading: 'The most expensive agent bug is the confident edit you did not need',
      body: [
        `FixedBench reports that strong agents propose unnecessary code changes on 35-65% of already-fixed tasks. Agent-ready repos should make "do nothing" defensible through clear behavior docs, tests that demonstrate the existing contract, and review guidance that flags unnecessary churn.`,
        `A reproduction command that passes should signal no change is needed. This connects to setup: a runnable environment is not just for making changes. It also helps the agent decide that no change is needed.`,
      ],
    },
  ],
  'task-specs-are-part-of-the-codebase': [
    {
      heading: 'Agents do not read your mind; they read your issue',
      body: [
        `Vendor guidance from OpenAI, Anthropic, GitHub, Cursor, and Augment converges on bounded tasks with explicit validation, file paths, and examples. Merged agent PRs correlate with shorter, well-scoped issues that name relevant artifacts.`,
        `Every task spanning more than one local edit cycle should include: goal, scope, relevant files, canonical example, constraints, non-goals, validation commands, expected output, and rollback notes.`,
      ],
    },
  ],
  'dependency-structure-beats-text-blobs': [
    {
      heading: 'Agents need relationships, not just files',
      body: [
        `GraphCodeAgent reports +43.81% relative Pass@1 improvement using graph-guided retrieval, with +94.30% on cross-file dependency tasks. SLICE reports 48-67% improvement over no-retrieval using semantic descriptions with backward program slicing. Plain text similarity is not enough for repository-scale work.`,
        `Keep import direction explicit. Avoid hidden dynamic registration, reflection, monkeypatching, and stringly typed coupling. Maintain generated dependency maps for large systems and align folders with architecture, not accidental chronology.`,
      ],
    },
  ],
  'types-reduce-hallucinated-apis': [
    {
      heading: 'Types constrain shape; agents need that constraint',
      body: [
        `ToolGen shows dependency coverage improvements of +31.4% to +39.1% and static validity improvements of +44.9% to +57.7% when models can access available symbols. CatCoder shows removing type context drops Java pass@k by up to 11.57%. Types do not solve logic, but they eliminate a large class of invalid-code errors.`,
        `Use explicit exports and imports, typed public APIs, generated clients over loose shape copying, reliable typecheck commands, and approved library lists in agent instructions.`,
      ],
    },
  ],
  'more-context-can-hurt': [
    {
      heading: 'This is not an argument for less documentation',
      body: [
        `Evaluating AGENTS.md found context files tended to reduce success and increased inference cost by over 20%. A3-CodGen reports that global retrieval F1 drops from 0.601 at k=5 to 0.479 at k=15. More context is not automatically better.`,
        `The argument is for layered, scoped, retrievable documentation. Put durable facts in the root file. Use scoped docs and package-level instructions for specialized workflows. Retrieve callers, callees, tests, and contracts before broad unrelated files.`,
      ],
    },
  ],
  'quality-gates-must-cover-smells': [
    {
      heading: 'Agent-generated code carries more smells than professional code',
      body: [
        `The Smells of LLM Generated Code paper reports substantially higher smell incidence in LLM-generated Java code than professional references. A Causal Perspective on Smells shows static-analysis-based measures can detect and mitigate smell propensity. Behavior tests alone miss these structural problems.`,
        `Run lint, typecheck, format, dead-code checks, and complexity rules. Use "no new warnings" CI policy. Add review checklist items for redundancy, incomplete implementation, naming inconsistency, unused variables, and broad exceptions.`,
      ],
    },
  ],
  'generated-sdks-turn-api-contracts-into-code': [
    {
      heading: 'Do not make the agent reverse-engineer your API from fetch calls',
      body: [
        `Raw fetch/axios calls hide the contract in strings: URL paths, query names, request bodies, response shapes, pagination, auth, retries, and error handling. A generated SDK moves those details into types, functions, schemas, and tests the agent can inspect. OpenAPI Generator, Kiota, Orval, Speakeasy, and Stainless all support this pattern.`,
        `Treat the API contract as a first-class source artifact. Generate clients in CI and fail if committed clients are stale. Ban raw calls to internal APIs when a generated SDK exists. Keep generated code in predictable folders and add examples showing authentication, retries, and error handling.`,
      ],
    },
  ],
  'repo-graphs-need-selective-slices': [
    {
      heading: 'Graph context helps, but bigger is not always better',
      body: [
        `Repository Intelligence Graph shows +12.2% accuracy improvement and -53.9% completion time reduction with explicit repo maps. The gains grow with repository complexity: +17.4% accuracy for high-complexity repos vs +1.1% for low-complexity. But RepoGraph shows that 2-hop flat context uses 10,505 tokens and resolves 26.00%, worse than 1-hop at 2,310 tokens resolving 29.67%.`,
        `The engineering rule is not "add a graph database to every repo." The rule is: make repository relationships recoverable, auditable, and selectively retrievable. Stable imports, package exports, generated clients, test names, architecture lint rules, and build targets expose the same edges that research graphs formalize.`,
      ],
    },
  ],
  'feature-work-fails-at-planning-and-constraints': [
    {
      heading: 'Patch application is not resolution',
      body: [
        `RACE-bench shows AutoCodeRover applies patches at 96.21% but resolves at 28.79%, a 67 pp gap. mini-SWE-Agent step recall drops to 0.445, meaning the agent misses over half the implementation steps. Constraint Decay shows that production-like structural constraints cause ~30 pp assertion-pass decay from L0 to L3.`,
        `Feature-friendly codebases must expose extension points, constraints, examples, and acceptance tests. CODETASTE shows GPT-5.2 instructed alignment at 69.6% versus open-direct at 7.7%. Agents execute specified transformations far better than they infer intended architectural moves from vague requests.`,
      ],
    },
  ],
  'setup-is-part-of-the-task': [
    {
      heading: 'Setup ambiguity is the first token sink',
      body: [
        `SetupBench shows best OpenHands overall success at 62.4%, with repo setup at 38.9-57.4% and local DB setup at 20.0-53.3%. Agents waste 38-69% of steps on ambiguous setup. Installamatic shows a 28.8% average installation rate and average attempt time of 501 seconds, with the longest run at nearly 80 minutes.`,
        `The minimal agent-ready setup contract: one canonical setup command, fresh-shell verification, scripted local services, targeted test slices per subsystem, and a smoke command under 60 seconds. Setup should be verified in a fresh shell, not only in the shell where the agent installed and exported things.`,
      ],
    },
  ],
  'agentic-prs-have-different-shape': [
    {
      heading: 'Agent PRs are productive but biased',
      body: [
        `AIDev documents 932,791 agentic PRs across 116,211 repositories. The How AI Coding Agents Modify Code paper reports Cliff delta for commits at 0.54 (large), files touched at 0.45 (medium), deletions at 0.45 (medium). The readability paper finds 56.1% of readability-intended agent commits deteriorated Maintainability Index and 71.5% increased Lines of Code.`,
        `Agent-friendly codebases should assume agent PRs are productive but biased. Review gates should watch for broad file touches, low deletion, compatibility shims, generated files edited by hand, tests changed without implementation, and architecture boundaries crossed.`,
      ],
    },
  ],
  'static-surfaces-are-agent-affordances': [
    {
      heading: 'Every hidden contract is an inference tax on the agent',
      body: [
        `CrossCodeEval shows almost 100% of references need cross-file information; only ~2% are predictable from the current file. Type-Constrained Code Generation shows 94% of generated TypeScript compile errors are type-check errors, reduced by 74.8% with type constraints. When Names Disappear shows GPT-4o class summarization dropping from 87.3 to 58.7 after name obfuscation.`,
        `Static surfaces -- typed SDKs, package exports, interfaces, LSP symbols, generated route maps, custom lint rules, and colocated examples -- turn hidden behavior into searchable, importable, autocomplete-able, and repairable facts. The agent reads the repo through these surfaces, not through tribal knowledge.`,
      ],
    },
  ],
  'codehealth-predicts-refactoring-success': [
    {
      heading: 'Code quality is a tax on cheaper models',
      body: [
        `Code for Machines shows all five medium-sized LLMs have statistically significant lower break rates on healthy code (p<0.001). Risk difference ranges from -8.58 pp (Qwen) to -15.12 pp (Gemma). CodeHealth is the root node in all five decision trees with feature importance 0.572-0.880. Frontier models (Claude at 94-96%) can compensate, but cost-sensitive workflows will use smaller models.`,
        `The code smells that matter are standard: nested complexity, complex methods, excessive arguments, complex conditionals, bumpy control flow. The CH=9 threshold was calibrated for human maintainability but also delineates AI refactoring risk. AI-friendly code is also human-friendly code.`,
      ],
    },
  ],
  'perplexity-is-not-file-level-ai-friendliness': [
    {
      heading: 'Same metric, different scale, different answer',
      body: [
        `Code for Machines finds negligible Cliff delta (-0.054 to +0.136) between file-level PPL and CodeHealth. Direction is inconsistent across models: some show higher PPL for healthy code. Granite shows zero effect (delta 0.000, p=0.992). Statistical significance without practical significance is a common trap with large sample sizes.`,
        `But How do Humans and LLMs Process Confusing Code shows PPL spikes correlate with human EEG confusion at the token level. The resolution: file-level PPL averages out local signals and cannot detect structural code smells. Token-level PPL detects surprising constructs. Use structural metrics for editability and PPL only for local confusion detection.`,
      ],
    },
  ],
  'voice-agent-latency-budget-is-product': [
    {
      heading: 'Latency is a waterfall, not a model property',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_01_latency_budget_is_the_product.md. The important point is that a user experiences one conversational delay, while the system hides many independent clocks: audio capture, transport, VAD, endpointing, STT finalization, LLM first token, TTS first audio, playback, and cancellation.`,
        `Moonshine v2 gives a useful ASR table because it reports response latency after VAD end-of-speech on Apple M3: 50 ms, 148 ms, and 258 ms for Moonshine v2 Tiny, Small, and Medium, compared with 289 ms, 1,940 ms, and 11,286 ms for Whisper Tiny, Small, and Large v3 in the same benchmark. Fish Audio S2 gives the TTS-side counterpart with RTF 0.195 and TTFA as low as 100 ms on H200 serving.`,
      ],
    },
    {
      heading: 'The first engineering task is instrumentation',
      body: [
        `The inference is not "pick the fastest model in every table." The inference is to emit timestamps for each stage and tune the full interaction budget. Endpointing can easily dominate the budget, and a faster STT model will not fix a silence policy that waits too long or a TTS path that cannot start streaming audio quickly.`,
        `The long-form note includes a waterfall diagram, copied ASR and TTS tables, and chart candidates. Before publishing this as an article claim, the missing piece is a measured Jarvis trace: mic capture, first VAD speech, user speech stop, endpoint decision, first partial, final transcript, LLM first token, TTS first audio, playback start, and interruption events.`,
      ],
    },
  ],
  'voice-agent-endpointing-is-turn-taking': [
    {
      heading: 'VAD is not the same as done speaking',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_02_endpointing_is_turn_taking.md. The strongest pattern is a three-layer model: VAD detects speech, endpointing decides whether a pause is enough, and semantic end-of-utterance models decide whether the user has completed the thought.`,
        `Silero versus WebRTC VAD is useful evidence for speech/noise classification, but it does not settle turn-taking. OpenAI exposes server_vad and semantic_vad separately. LiveKit, Pipecat, and Deepgram all expose learned or conversational turn logic because silence alone is a crude proxy for completion.`,
      ],
    },
    {
      heading: 'Endpointing is where fast becomes rude',
      body: [
        `A shorter silence threshold can make the agent feel quick, but it also increases false interruptions. A longer silence threshold can make the agent patient, but it creates dead air. Semantic EOU tries to escape that tradeoff by predicting intent, but it adds model behavior that must be measured.`,
        `The note copies OpenAI, LiveKit, Pipecat, Deepgram, Silero, and human turn-taking numbers into one source map. The research gap is a local Jarvis EOT dataset: false EOT, missed EOT, backchannel handling, and interruption success should be measured separately from STT WER.`,
      ],
    },
  ],
  'streaming-stt-is-not-batch-stt': [
    {
      heading: 'WER is necessary, but not the agent metric',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_03_streaming_stt_is_not_batch_stt.md. Open ASR Leaderboard is useful because it standardizes average WER and RTFx, but those are still batch-ish metrics. Voice agents also need first partial, partial stability, finalization latency, end-of-turn latency, entity accuracy, and tail percentiles.`,
        `The Open ASR Leaderboard table is still valuable: it shows modern systems like NVIDIA Canary Qwen, Parakeet TDT, Qwen3 ASR, Whisper Large v3, and others across WER and RTFx. The note is careful not to turn that into a universal voice-agent leaderboard because RTFx is throughput, not user-perceived turn latency.`,
      ],
    },
    {
      heading: 'Moonshine is the live-ASR source to keep close',
      body: [
        `Moonshine v2 is especially relevant for the deck because it defines response latency as time between VAD-detected end of speech and transcript return. That is closer to voice-agent behavior than file throughput. Its Apple M3 table gives clear chart material for the STT slide.`,
        `The practical recommendation is to benchmark STT on the target conversation, including domain entities, pauses, interruptions, and noisy playback. Clean LibriSpeech WER is not enough for deciding whether the agent can answer at the right time.`,
      ],
    },
  ],
  'tts-latency-is-architecture': [
    {
      heading: 'The voice sample is not the serving system',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_04_tts_latency_is_architecture.md. TTS quality still matters, but voice agents need first playable audio, streaming cadence, RTF headroom, cancellation, and serving stability. RTF is necessary but not sufficient because it measures total synthesis speed, not when audio starts.`,
        `The note groups models by architecture: small local decoder systems like Kokoro/Piper, flow-matching systems like F5-TTS, AR speech-token systems like Fish Audio S2/Spark/Dia/Orpheus, and legacy cloning systems like XTTS. The useful deck move is to show these as latency shapes rather than one global leaderboard.`,
      ],
    },
    {
      heading: 'Use the numbers with their hardware attached',
      body: [
        `F5-TTS gives a clean quality/speed tradeoff: 16 NFE Euler reports LibriSpeech-PC WER 2.53, UTMOS 3.88, RTF 0.15; 32 NFE Euler reports WER 2.42, UTMOS 3.90, RTF 0.31. Fish Audio S2 reports RTF 0.195 and TTFA as low as 100 ms, but on a single NVIDIA H200 with SGLang serving.`,
        `The local demo recommendation remains conservative: Kokoro is practical because it is tiny and easy to keep hot, while Fish S2 is the best primary-source example of where production streaming TTS is going. Direct local Kokoro TTFA still needs measurement before making a hard performance claim.`,
      ],
    },
  ],
  'transport-is-media-correctness': [
    {
      heading: 'The transport choice is about owning media behavior',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_05_transport_is_media_correctness.md. WebSocket can stream audio and is fine for local demos, server-to-server streams, and telephony integrations. The issue is that browser/mobile voice needs media behavior: AEC, jitter buffering, packet timing, Opus, NAT traversal, stats, and playout semantics.`,
        `OpenAI's Realtime docs and Pipecat's transport docs both point toward WebRTC for browser/mobile/client voice and WebSocket for server-side or controlled integrations. The local transport deep dive adds an important correction: WebSocket frame overhead is not the primary problem; ordered TCP behavior, playout, echo, and cancellation are.`,
      ],
    },
    {
      heading: 'WebRTC does not make the model stack fast',
      body: [
        `WebRTC is the media substrate. It does not solve endpointing, STT finalization, LLM first token, or TTS first audio. A perfect media path can still feel slow if the turn detector waits too long or the TTS stack has high TTFA.`,
        `The article should therefore avoid shallow protocol tribalism. The right recommendation is situational: WebRTC by default for production browser/mobile voice, WebSocket for server streams and controlled prototypes, and a measured waterfall either way.`,
      ],
    },
  ],
  'barge-in-is-the-real-system-test': [
    {
      heading: 'Interruption turns demos into systems',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_06_barge_in_is_the_real_system_test.md. A single-turn prompt/response demo does not prove that a voice agent is conversational. The user must be able to interrupt it, and the system must stop playout, cancel or truncate model/TTS streams, preserve transcript state, and listen to the new turn.`,
        `Barge-in is hard because the agent is listening while it speaks. Without echo cancellation or correct media timing, it can transcribe itself, reset its own VAD, or ignore the real user. Without semantic interruption policy, it can treat backchannels like "yeah" as stop commands or ignore actual corrections.`,
      ],
    },
    {
      heading: 'The test is media plus state',
      body: [
        `The note proposes testing interruption at different assistant-audio positions, with speaker playback, backchannels, true stop commands, and stale model/TTS streams. The key measurements are stop latency, stale audio leakage, transcript correctness, cancellation acknowledgement, and whether the next response addresses the user's interruption.`,
        `This insight is the practical bridge between endpointing and transport. VAD helps detect the user, WebRTC helps with echo/media timing, TTS needs cancellation, and the app needs a conversation-history contract for what the user actually heard.`,
      ],
    },
  ],
  'native-speech-models-change-the-boundary': [
    {
      heading: 'Native speech attacks the cascade itself',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_07_native_speech_models_change_the_boundary.md. Cascaded systems split STT, LLM, and TTS. Native speech-to-speech models move speech tokens into the model boundary, preserving prosody, overlap, backchannels, and timing signals that text discards.`,
        `Moshi is the strongest conceptual source: it names the cascade problems as compounded latency, text bottleneck, and turn-based segmentation. It reports 160 ms theoretical latency, 200 ms practical latency, Mimi at 12.5 Hz, and full-duplex multi-stream modeling. Qwen2.5-Omni, Mini-Omni, and GLM-4-Voice show adjacent designs using Thinker/Talker structures, parallel decoding, or low-bitrate speech tokenizers.`,
      ],
    },
    {
      heading: 'The cascade is still the practical baseline',
      body: [
        `The important caveat is that native speech does not automatically win in production. Cascades are easier to debug, moderate, log, tool-call, and swap component-by-component. Native systems often need custom serving and much richer audio-level evaluation.`,
        `For the article and deck, native speech should be framed as "where the boundary is moving," not as a replacement recommendation for every builder. Start with a debuggable cascade, add turn-taking and barge-in, then move native if the product really needs duplex, prosody, or lower boundary latency.`,
      ],
    },
  ],
  'voice-agent-eval-needs-multiple-metrics': [
    {
      heading: 'No single metric describes a voice agent',
      body: [
        `The canonical research note lives at presentations/voice-agents/research/insights/INSIGHT_08_voice_agent_eval_needs_multiple_metrics.md. WER measures transcript closeness, MOS/UTMOS measures voice quality, RTF/RTFx measures speed or throughput, and demos measure a selected happy path. None of those alone tells whether the agent works as a conversation system.`,
        `The research now spans incompatible metrics: WER, CER, RTFx, RTF, TTFA, UTMOS, SIM, ROC-AUC, EOT latency, jitter, packet loss, interruption success, and task success. The right output is a trace-based harness rather than a single leaderboard.`,
      ],
    },
    {
      heading: 'The eval should follow the turn trace',
      body: [
        `The proposed trace records audio capture, first VAD speech, speech end, endpoint decision, first partial, final transcript, LLM first token, TTS first audio, playback start, interruption, and cancellation. From that trace, the system can compute p50/p95/p99 latency, false EOT, missed EOT, entity WER, TTFA, barge-in success, and cost per live minute.`,
        `This is the strongest practical closing for the future article: benchmark your product conversation, not just the model demo. A small Jarvis regression set with pauses, corrections, backchannels, noisy playback, and domain terms would turn this research into a defensible engineering artifact.`,
      ],
    },
  ],
} as const satisfies Record<InsightSlug, readonly InsightSection[]>;

export type PublishedInsight = Insight & {
  sections: readonly InsightSection[];
};

function withSections(insight: Insight): PublishedInsight {
  const sections = insightSections[insight.slug as InsightSlug];

  if (!sections) {
    throw new Error(`Missing long-form sections for insight slug: ${insight.slug}`);
  }

  validateInsightGraph(insight);

  return {
    ...insight,
    sections,
  };
}

export function getAllInsights(): PublishedInsight[] {
  return [...insights]
    .sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .map(withSections);
}

export function getInsightBySlug(slug: string): PublishedInsight | null {
  const insight = insights.find((candidate) => candidate.slug === slug);

  if (!insight) {
    return null;
  }

  return withSections(insight);
}

export function getAllInsightSlugs(): InsightSlug[] {
  return insights.map((insight) => insight.slug);
}

export function getRelatedInsights(insight: PublishedInsight): PublishedInsight[] {
  const relatedSlugs = Array.from(
    new Set(
      insight.graph.edges
        .filter((edge) => edge.targetType === 'insight')
        .map((edge) => edge.targetSlug)
    )
  );

  return relatedSlugs.map((slug) => {
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

export function getAllBrainGraphDocuments(): BrainGraphDocument[] {
  return [...brainGraphDocuments];
}
