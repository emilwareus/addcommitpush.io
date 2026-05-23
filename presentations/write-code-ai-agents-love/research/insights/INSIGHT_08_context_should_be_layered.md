# INSIGHT 08: Context Should Be Layered

The best agent context is layered: a small hot path loaded by default, and deeper cold context
fetched only when relevant. This is not a theoretical principle -- it is the pattern that emerges from
every serious attempt to scale agent context beyond a single file. The evidence converges from a
case study of a 108,000-line system, from empirical analysis of developer configuration practices,
from counterexamples showing that excessive context hurts, and from practitioner documentation
systems that implement exactly this tiering.

The core tension: agents need context to avoid mistakes, but context windows fill quickly and
attention degrades with volume. The solution is not "less context" or "more context" but "the
right context at the right time" -- hot memory for invariants, cold memory for specifics.

## Source map

| Ref | Source | Local text | Role in this insight |
|---|---|---|---|
| R15 | Codified Context | `paper-text/codified-context-2602.20478.txt` | Case study implementing hot/cold/specialist tiered context in a 108K-line C# system. |
| R18 | Evaluating AGENTS.md | `paper-text/evaluating-agents-md-2602.11988.txt` | Counter-evidence: context files can reduce success and increase cost when they add noise. |
| R19 | Claude Code Configs | `paper-text/claude-code-configs-2511.09268.txt` | 328 configuration files showing what developers encode in hot-loaded context. |
| D05 | Anthropic best practices | `articles/anthropic-claude-code-best-practices.html` | Vendor guidance: context windows fill quickly, performance degrades as sessions grow. |
| D06 | GitHub Copilot best practices | `articles/github-copilot-coding-agent-best-practices.html` | Scoped rules/instructions for Copilot agents. |
| D07 | Cursor rules for AI | `articles/cursor-rules-for-ai.html` | Rule files injected into model context, can be scoped by path. |
| D09 | Aider repo map | `articles/aider-repomap.md` | Compact structural context for large codebases. |
| R74 | Agent READMEs | `paper-text/agent-readmes-context-files-2025.txt` | Empirical study of 2,303 agent context files across Claude Code, Codex, and Copilot. |

## Codified Context: the tiered architecture in practice

This paper documents the construction of a three-tier context infrastructure during development of
a 108,000-line C# distributed system over 283 development sessions.

### Codified Context architecture

| Tier | Name | Loading strategy | Content | Size |
|---|---|---|---|---|
| 1 | Project Constitution (Hot Memory) | Always loaded, every session | Conventions, retrieval hooks, orchestration protocols | ~660 lines |
| 2 | Domain-Expert Agents (Specialists) | Invoked per task, triggered by signals | 19 specialized agents embedding project-specific knowledge | Variable |
| 3 | Knowledge Base (Cold Memory) | Retrieved on demand | 34 specification documents, design intent, failure modes | Substantial |

### Codified Context quantitative data

| Measurement | Value | Unit |
|---|---:|---|
| Codebase size | 108,000 | lines of C# |
| Development sessions | 283 | sessions |
| Human prompts | 2,801 | total interactions |
| Agent invocations | 1,197 | specialist agent calls |
| Agent turns | 16,522 | total across all sessions |
| Specialized agents | 19 | domain experts |
| Specification documents (cold memory) | 34 | on-demand docs |
| Total context infrastructure | ~26,000 | lines |

Source trace: R15, `paper-text/codified-context-2602.20478.txt`.

Key design decisions from the paper:

1. **Hot memory is always loaded** -- ~660 lines defining conventions, build commands,
   architectural pattern summaries, and checklists. This is what every session needs.

2. **Specialists embed substantial domain knowledge** -- agents in Tier 2 carry project-specific
   knowledge directly in their specifications, "often constituting over half of agent content."
   The paper notes agents in "complex, bug-prone domains produced significantly more errors
   without pre-loaded context."

3. **Cold memory is indexed, not stuffed** -- 34 specification documents available on demand
   through an MCP retrieval server. These contain design intent, constraints, and failure modes
   not present in any single source file.

4. **Overlap is intentional** -- specialists embed information also available in cold memory.
   This emerged from observing that retrieval-only approaches produced more errors for
   complex tasks. The redundancy is a design choice, not a failure of organization.

The paper explicitly addresses scaling: "a 1,000-line prototype can be fully described in a single
prompt, but a 100,000-line system cannot." The three-tier system is the answer to this scaling
challenge.

## Evaluating AGENTS.md: flat context hurts

The counterexample is important. When context files are not layered -- when everything is loaded
as a flat block of instructions -- the result is often worse than no context at all.

### Evaluating AGENTS.md data on context file impact

| Setting | Effect on task success | Effect on cost |
|---|---|---|
| No context file | Baseline | Baseline |
| LLM-generated context file | Tends to reduce success | Increases cost by >20% |
| Developer-provided context file | Tends to reduce success | Increases cost |
| Behavioral change with context | More exploration, more testing | Agents respect instructions even when unhelpful |

Source trace: R18, `paper-text/evaluating-agents-md-2602.11988.txt`.

The paper's root cause analysis: "unnecessary requirements from context files make tasks harder."
This happens because agents try to satisfy ALL instructions, including ones irrelevant to the current
task. A flat context file that includes formatting rules, architectural guidelines, AND domain
constraints forces the agent to attend to all of them simultaneously, diluting focus on what matters.

This directly supports layering: if the formatting rules were in a code-style file loaded only during
formatting tasks, and the domain constraints in a specialist loaded only for domain work, the agent
would not waste attention on irrelevant rules.

## Claude Code Configs: what developers put in hot context

The analysis of 328 Claude Code configuration files shows what the community converges on as
"always-loaded" information.

### Most common concerns in Claude Code configs

| Concern category | Prevalence | Interpretation |
|---|---|---|
| Application architecture | 72.6% | Most files describe structure |
| Build/test commands | Common | Exact copy-paste commands |
| Code style | Common | Naming, imports, formatting |
| Workflow guidelines | Common | When to test, what to avoid |
| Median headings per file | 7 | Moderate structure |

Source trace: R19, `paper-text/claude-code-configs-2511.09268.txt`.

The implicit layering: a CLAUDE.md file is Tier 1 (hot memory). It tells the agent about architecture,
commands, and style. But it does not contain the full specification of every subsystem, every API,
every design decision. Those live in code, docs, and tests -- effectively cold memory that the agent
retrieves when needed.

## Agent READMEs: the ecosystem validates layering

The empirical study of 2,303 agent context files across Claude Code, Codex, and GitHub Copilot
repositories provides ecosystem-level evidence. The paper documents adoption patterns, content
categories, and structural choices across the broader developer community.

Source trace: R74, `paper-text/agent-readmes-context-files-2025.txt`.

## Practitioner tools implement layering

Multiple practitioner tools have independently converged on layered context:

| Tool | Hot context | Cold/scoped context | Evidence |
|---|---|---|---|
| Claude Code | CLAUDE.md at root | Subdirectory CLAUDE.md files | D05: scoped by directory hierarchy |
| Cursor | .cursorrules | Path-specific rule files | D07: rules can be scoped to paths |
| GitHub Copilot | Repository instructions | Path-specific instructions | D06: supports both levels |
| Aider | In-chat conventions | Repo map (generated) | D09: compact structural summary |

Source quality: `official-doc evidence` for all four.

The convergence is significant: these tools were developed independently by different companies, yet
all arrived at the same two-tier (or multi-tier) pattern. This suggests the layering need is fundamental
to the problem, not an arbitrary design choice.

## The hot/cold distinction formalized

Based on the evidence, the boundary between hot and cold context can be defined functionally:

**Hot context** (always loaded): information the agent needs for ANY task in the repository.
- Build and test commands (exact, copy-paste)
- Architecture overview (module boundaries, key components)
- Code style constraints (naming, imports, patterns)
- Non-negotiable rules (what never to do)
- Trigger table (which specialist/doc to consult for which domain)

**Cold context** (loaded on demand): information the agent needs only for SPECIFIC tasks.
- Detailed specification documents per subsystem
- API contracts and design decisions for specific modules
- Migration guides and changelog for specific features
- Test infrastructure details for specific test types
- Domain-specific knowledge (e.g., coordinate systems, protocol formats)

The Codified Context paper adds a middle tier:

**Warm context** (specialist agents): pre-packaged combinations of domain knowledge and
instructions that are loaded when the task matches a specific domain trigger.

## Explicit inference

1. **Flat context hurts for complex repositories.** Evaluating AGENTS.md directly shows context
   files can reduce success. The failure mode is attention dilution: irrelevant instructions compete
   with relevant ones.

2. **Hot context must be brief and universal.** The Codified Context constitution is ~660 lines
   for a 108K-line system -- less than 1% of the codebase, yet sufficient to orient every session.

3. **Cold context needs a retrieval mechanism.** Stuffing everything into the prompt is the
   anti-pattern. The 34 specification documents in Codified Context are retrieved via MCP, not
   loaded by default.

4. **The middle tier (specialists/scoped rules) bridges the gap.** Pure hot+cold leaves a gap
   where the agent knows THAT a domain exists but not HOW to work in it. Specialists or
   scoped rule files fill this gap.

5. **The ecosystem has converged on this pattern independently.** Claude Code, Cursor, Copilot,
   and Aider all implement some form of layered context. This is strong practitioner signal that
   the pattern works.

## What this does not prove

- This does not prove that any specific tier count is optimal. Three tiers worked for one 108K-line
  system. Smaller projects may need only two; larger ones might need more.

- This does not prove that hot context size has a sharp threshold. The ~660 line constitution may
  be too large for some models or too small for some projects. The paper does not ablate this.

- This does not prove that retrieval-based cold context is always reliable. The Codified Context
  paper notes that specialists embed redundant information specifically because retrieval-only
  produced more errors for complex tasks.

- The Codified Context paper is a single-project case study (n=1). The patterns are well-supported
  by converging practitioner evidence, but the quantitative data is from one system.

- Evaluating AGENTS.md measures issue resolution on specific benchmarks. The negative effect of
  flat context may be smaller or larger for different task types.

## Practical pattern

```
root/
  CLAUDE.md              # Tier 1: hot memory (~500-1000 lines)
                         # - build/test commands
                         # - architecture overview
                         # - code style rules
                         # - non-negotiable constraints
                         # - trigger table for deeper context

  packages/auth/
    CLAUDE.md            # Tier 2: scoped context
                         # - auth-specific patterns
                         # - local test commands
                         # - domain-specific rules

  docs/
    architecture/        # Tier 3: cold memory (on-demand)
      system-design.md
      data-model.md
      api-contracts.md
      deployment.md

  .cursor/rules/         # Alternative Tier 2: path-scoped rules
    frontend.md
    backend.md
    infra.md
```

## Blog visual candidates

1. Three-tier pyramid diagram: hot (small, always loaded) -> warm (medium, triggered by domain)
   -> cold (large, retrieved on demand).
2. Token budget allocation: how a 200K context window fills across a session, showing when flat
   context causes overflow vs. when layered context stays within budget.
3. Evaluating AGENTS.md: flat context vs. no context performance comparison (the negative
   surprise).
4. Codified Context growth over 283 sessions: infrastructure lines vs. application lines.
5. Tool convergence table: 4 independent tools, same layering pattern.

## References

- R15: Codified Context, `paper-text/codified-context-2602.20478.txt`
- R18: Evaluating AGENTS.md, `paper-text/evaluating-agents-md-2602.11988.txt`
- R19: Claude Code Configs, `paper-text/claude-code-configs-2511.09268.txt`
- R74: Agent READMEs, `paper-text/agent-readmes-context-files-2025.txt`
- D05: Anthropic Claude Code best practices, `articles/anthropic-claude-code-best-practices.html`
- D06: GitHub Copilot coding agent best practices, `articles/github-copilot-coding-agent-best-practices.html`
- D07: Cursor rules for AI, `articles/cursor-rules-for-ai.html`
- D09: Aider repo map, `articles/aider-repomap.md`
