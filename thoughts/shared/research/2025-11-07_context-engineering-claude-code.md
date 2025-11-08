---
date: 2025-11-07T00:00:00Z
researcher: Claude Code
git_commit: 061153440c422dea14cacfca93c10eaa8d54683d
branch: main
repository: addcommitpush.io
topic: 'Advanced Context Engineering with Claude Code'
tags: [research, claude-code, context-engineering, agents, commands, bash-scripts, workflows]
status: complete
last_updated: 2025-11-07
last_updated_by: Claude Code
---

# Research: Advanced Context Engineering with Claude Code

**Date**: 2025-11-07
**Researcher**: Claude Code
**Git Commit**: 061153440c422dea14cacfca93c10eaa8d54683d
**Branch**: main
**Repository**: addcommitpush.io

## Research Question

How does advanced context engineering work in Claude Code, including custom commands, specialized agents, bash scripts vs MCP tools, and example workflows from real-world implementation?

## Summary

Context engineering with Claude Code is about **deliberately structuring and compacting information** to maximize agent effectiveness. This research reveals a three-tiered system:

1. **Custom Commands** (`.claude/commands/*.md`) - Orchestrate complex workflows (research → plan → implement → validate)
2. **Specialized Agents** (`.claude/agents/*.md`) - Handle focused research tasks in parallel with minimal context
3. **Bash Scripts** (`scripts/*.ts`) - Execute automation outside the context window

**Key Insight**: Rather than cramming everything into prompts, advanced users decompose tasks into specialized phases, spawn parallel sub-agents for research, and offload computation to TypeScript scripts executed via bash.

**Core Principles** from advanced context engineering framework:

- Context engineering ≠ cramming more into prompts
- Deliberate practice of structuring, compacting, and aligning information
- Use sub-agents for task decomposition (planning → research → implementation)
- Human focus hierarchy: **CLAUDE.md > prompts > research > plans > implementation**

## Detailed Findings

### 1. The Three-Phase Pipeline Pattern

**Core Workflow** discovered in this repository:

```
Phase 1: Research (discover)      → .claude/commands/research_codebase.md
Phase 2: Planning (design)        → .claude/commands/create_plan.md
Phase 3: Implementation (execute) → .claude/commands/implement_plan.md
Phase 4: Validation (verify)      → .claude/commands/validate_plan.md
```

#### Phase 1: Research ([.claude/commands/research_codebase.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/commands/research_codebase.md))

**Purpose**: Comprehensive codebase exploration through parallel sub-agent orchestration

**Key Characteristics**:

- Spawns multiple specialized agents concurrently
- Synthesizes findings from different perspectives
- Generates structured research documents (`.claude/research/*.md`)
- Uses YAML frontmatter for metadata tracking

**Agent Orchestration Pattern**:

```markdown
1. Read directly mentioned files FULLY (no partial reads)
2. Spawn parallel research tasks:
   - codebase-locator: Find WHERE code lives
   - codebase-analyzer: Understand HOW code works
   - codebase-pattern-finder: Find similar implementations
   - thoughts-locator: Discover existing documentation
   - thoughts-analyzer: Extract insights from docs
3. Wait for ALL agents to complete
4. Synthesize findings with file:line references
5. Generate timestamped research document
```

**Context Compaction Strategy**:

- Main context ONLY sees agent results (not raw file reads)
- Each agent uses focused tools (Grep, Glob, Read, LS)
- Results pre-filtered and structured before synthesis
- Prevents "context explosion" from reading entire codebase

**Example Research Output Structure**:

```markdown
---
date: 2025-11-07T00:00:00Z
researcher: Claude Code
git_commit: <hash>
tags: [research, codebase, specific-components]
status: complete
---

## Research Question

[Original user query]

## Summary

[High-level findings]

## Detailed Findings

### Component 1

- Finding with reference (file:line)
- Connection to other components

## Code References

- `path/to/file.ts:123` - Description
```

**Real Example**: [.claude/research/2025-11-07_audio-files-blog-posts.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/research/2025-11-07_audio-files-blog-posts.md) - 754 lines of comprehensive research on audio serving architecture

#### Phase 2: Planning ([.claude/commands/create_plan.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/commands/create_plan.md))

**Purpose**: Interactive plan creation with skepticism and thoroughness

**Critical Pattern - "Read FULLY before spawning sub-tasks"**:

```markdown
Step 1: Read all mentioned files IMMEDIATELY and FULLY

- Use Read tool WITHOUT limit/offset parameters
- DO NOT spawn sub-tasks before reading these files yourself
- CRITICAL: Read files completely, not partially

Step 2: Spawn initial research tasks

- codebase-locator to find related files
- codebase-analyzer to understand implementation
- thoughts-locator to find existing decisions

Step 3: Read ALL files identified by research tasks

- After research completes, read them FULLY
- Complete understanding before proceeding
```

**Interactive Planning Flow**:

1. Read ticket/requirements fully
2. Research codebase patterns in parallel
3. Present findings and ask focused questions
4. Draft plan structure collaboratively
5. Write detailed plan with phases

**Plan Structure Template**:

````markdown
# Feature Implementation Plan

## Overview

[What we're building]

## Current State Analysis

[What exists, what's missing]

## Desired End State

[Specification + verification steps]

## What We're NOT Doing

[Explicit scope boundaries]

## Phase 1: [Name]

### Changes Required:

#### 1. Component/File

**File**: `path/to/file`
**Changes**: [Summary]

```code
// Specific code to add
```
````

### Success Criteria:

#### Automated Verification:

- [ ] Build succeeds: `pnpm build`
- [ ] Linting passes: `pnpm lint`
- [ ] Type checking: `pnpm exec tsc --noEmit`

#### Manual Verification:

- [ ] Feature works as expected in UI
- [ ] Edge cases handled

````

**Key Innovation - Automated vs Manual Verification**:
- **Automated**: Commands execution agents can run (`pnpm build`, curl checks)
- **Manual**: Requires human testing (UI, UX, performance under load)
- **Result**: Clear separation enables autonomous execution agents

**Real Example**: [.claude/plans/audio-blog-posts-implementation.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/plans/audio-blog-posts-implementation.md) - 6 phases, 645 lines, detailed success criteria

#### Phase 3: Implementation ([.claude/commands/implement_plan.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/commands/implement_plan.md))

**Purpose**: Execute approved plans with adaptive judgment

**Philosophy**:
```markdown
Plans are carefully designed, but reality can be messy.
- Follow the plan's intent while adapting to what you find
- Think deeply when plans don't match reality
- Update checkboxes as you complete sections
````

**Verification Approach**:

```bash
# After each phase, run:
pnpm build
pnpm lint
pnpm exec tsc --noEmit

# Fix issues before proceeding
# Update plan checkboxes with Edit tool
```

**Resuming Work Pattern**:

- Trust completed checkmarks
- Pick up from first unchecked item
- Verify previous work only if something seems off

#### Phase 4: Validation ([.claude/commands/validate_plan.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/commands/validate_plan.md))

**Purpose**: Verify implementation matches plan specifications

**Discovery Strategy**:

```bash
# If starting fresh:
git log --oneline -n 20
git diff HEAD~N..HEAD

# Run comprehensive checks:
pnpm build
pnpm lint
pnpm exec tsc --noEmit
```

**Validation Report Structure**:

```markdown
## Validation Report: [Plan Name]

### Implementation Status

✓ Phase 1: Fully implemented
⚠️ Phase 2: Partially implemented (see issues)

### Automated Verification Results

✓ Build passes
✗ Linting issues: 3 warnings

### Code Review Findings

#### Matches Plan:

- Database migration correct
- API endpoints implemented

#### Deviations:

- Different variable names (improvement)

#### Potential Issues:

- Missing index could impact performance

### Manual Testing Required:

- [ ] Verify feature in UI
- [ ] Test error states
```

### 2. Specialized Agent Architecture

**Discovered Pattern**: Instead of monolithic research, spawn focused agents with minimal tool access

#### Agent 1: codebase-locator ([.claude/agents/codebase-locator.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/agents/codebase-locator.md))

**Role**: "Super Grep/Glob/LS tool" - Find WHERE code lives

**Tools**: Grep, Glob, LS (read-only, search-focused)

**Responsibilities**:

- Find files by topic/feature
- Categorize findings (implementation, tests, config, types)
- Return structured locations (NOT content analysis)

**Output Format**:

```markdown
## File Locations for [Feature]

### Implementation Files

- `app/(site)/blog/[slug]/page.tsx` - Blog post route
- `lib/posts.ts` - Content loader utilities

### Test Files

- `__tests__/lib/posts.test.ts` - Unit tests

### Configuration

- `next.config.ts` - Next.js config
- `tsconfig.json` - TypeScript config
```

**Key Constraint**: "Don't read file contents - Just report locations"

**Context Benefit**: Returns 20-50 lines of structured paths instead of thousands of lines of code

#### Agent 2: codebase-analyzer ([.claude/agents/codebase-analyzer.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/agents/codebase-analyzer.md))

**Role**: Understand HOW code works with surgical precision

**Tools**: Read, Grep, Glob, LS

**Responsibilities**:

- Analyze implementation details
- Trace data flow
- Identify architectural patterns
- Provide exact file:line references

**Analysis Strategy**:

```markdown
Step 1: Read Entry Points

- Main files mentioned
- Public methods/exports
- Surface area identification

Step 2: Follow Code Path

- Trace function calls
- Note transformations
- Identify dependencies
- Ultrathink about connections

Step 3: Understand Key Logic

- Focus on business logic
- Identify validation, transformation, error handling
```

**Output Example**:

```markdown
## Analysis: [Component]

### Entry Points

- `api/routes.js:45` - POST /webhooks endpoint

### Core Implementation

#### 1. Request Validation (`handlers/webhook.js:15-32`)

- Validates signature using HMAC-SHA256
- Returns 401 if validation fails

### Data Flow

1. Request → api/routes.js:45
2. Validation → handlers/webhook.js:15-32
3. Processing → services/webhook-processor.js:8
```

**Key Directive**: "Always include file:line references for claims"

#### Agent 3: codebase-pattern-finder ([.claude/agents/codebase-pattern-finder.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/agents/codebase-pattern-finder.md))

**Role**: Find similar implementations to model after

**Tools**: Grep, Glob, Read, LS

**Value**: Provides concrete code examples, not just descriptions

**Search Strategy**:

```markdown
Step 1: Identify pattern types

- Feature patterns (similar functionality)
- Structural patterns (organization)
- Integration patterns (connections)
- Testing patterns (how to test)

Step 2: Search for examples

- Use Grep/Glob/LS
- Read promising files
- Extract relevant sections

Step 3: Present multiple variations

- Show working code with context
- Note which approach is preferred
- Include test examples
```

**Output Structure**:

````markdown
## Pattern Examples: [Type]

### Pattern 1: [Name]

**Found in**: `src/api/users.js:45-67`
**Used for**: User listing with pagination

```javascript
// Actual working code
router.get('/users', async (req, res) => {
  // Implementation
});
```

**Key aspects**:

- Uses query parameters for page/limit
- Returns pagination metadata

### Testing Patterns

**Found in**: `tests/api/pagination.test.js:15-45`

```javascript
describe('Pagination', () => {
  it('should paginate results', async () => {
    // Test implementation
  });
});
```
````

**Critical Insight**: "Show working code, not just snippets"

### 3. Context Compaction Techniques

#### Technique 1: Hierarchical Agent Spawning

**Pattern**: Main context spawns agents → Agents use tools → Only results return

**Context Flow**:

```
User Query (100 words)
    ↓
Main Agent spawns 3 sub-agents in parallel
    ↓
Agent 1: Searches 50 files → Returns 200 words of findings
Agent 2: Analyzes 10 files → Returns 300 words of analysis
Agent 3: Finds patterns in 30 files → Returns 250 words of examples
    ↓
Main Agent synthesizes 750 words total
    ↓
Research Document (2000 words with references)
```

**Alternative (without agents)**:

```
User Query
    ↓
Main context reads 50 files (50,000+ words)
    ↓
Context overflow / degraded performance
```

**Savings**: ~98% context reduction (750 words vs 50,000+ words)

#### Technique 2: Metadata-First Architecture

**Pattern**: Store metadata in YAML frontmatter, load content on-demand

**Example from research documents**:

```yaml
---
date: 2025-11-07T00:00:00Z
researcher: Claude Code
git_commit: <hash>
tags: [research, codebase, components]
status: complete
last_updated: 2025-11-07
---
```

**Benefits**:

- Quick scanning without reading full documents
- Git metadata linked (reproducibility)
- Status tracking (complete, in-progress, implemented)
- Can locate relevant research by tags without reading content

#### Technique 3: "Read FULLY before spawning" Rule

**Critical Discovery from create_plan.md**:

```markdown
IMPORTANT: Use the Read tool WITHOUT limit/offset parameters
CRITICAL: DO NOT spawn sub-tasks before reading these files yourself
NEVER read files partially - if mentioned, read completely
```

**Rationale**:

- Partial reads lead to misunderstanding
- Sub-agents can't fix incomplete context from main agent
- Full read = better decomposition into sub-tasks
- Prevents "telephone game" of partial information

**Anti-Pattern**:

```
User mentions ticket file →
  Main agent spawns research agent with partial context →
    Research agent misunderstands →
      Wrong findings →
        Invalid plan
```

**Correct Pattern**:

```
User mentions ticket file →
  Main agent reads FULLY →
    Understands requirements →
      Spawns focused research agents with clear instructions →
        Accurate findings →
          Valid plan
```

### 4. Bash Scripts vs MCP Tools

**Key Principle**: Offload computation outside context window

#### Example 1: Image Optimization ([scripts/optimize-images.ts](file:///Users/emilwareus/Development/addcommitpush.io/scripts/optimize-images.ts))

**Purpose**: Generate AVIF, WebP, and optimized originals from source images

**Why Script Instead of MCP Tool**:

1. **No context consumption**: Runs entirely in bash, zero tokens used
2. **Reusable by humans**: `pnpm optimize-images` works outside Claude Code
3. **Version controlled**: Script logic in git, not hidden in MCP server
4. **Debuggable**: Can run with `console.log`, inspect output
5. **Composable**: Can chain with other scripts

**Architecture**:

```typescript
// scripts/optimize-images.ts
import sharp from 'sharp';

const config = {
  quality: { avif: 75, webp: 80, jpeg: 85 },
  concurrency: 4,
  targetFormats: ['avif', 'webp', 'original'],
};

async function findImages(directory: string): Promise<string[]>;
async function optimizeImage(inputPath: string): Promise<OptimizationResult>;

// Execution via: pnpm optimize-images
```

**Usage in Claude Code**:

```markdown
# In command or agent:

Run: `pnpm optimize-images` to generate optimized variants
No need to process images in context - script handles everything
```

**Pre-approval in settings** ([.claude/settings.local.json:26](file:///Users/emilwareus/Development/addcommitpush.io/.claude/settings.local.json#26)):

```json
{
  "permissions": {
    "allow": ["Bash(pnpm optimize-images:*)"]
  }
}
```

#### Example 2: Text Extraction ([scripts/extract-post-text.ts](file:///Users/emilwareus/Development/addcommitpush.io/scripts/extract-post-text.ts))

**Purpose**: Extract plain text from blog post components for TTS generation

**Why Script**:

- Parses React/JSX without loading into context
- Regex transformations outside token budget
- Outputs clean text file for audio workflow
- Human-runnable: `pnpm extract-text <slug>`

**Workflow Integration**:

```
1. Human/Claude: `pnpm extract-text recruiting-engineers-as-a-startup`
   Output: podcasts/scripts/recruiting-engineers-as-a-startup.txt

2. Claude uses /refine-text command to improve for audio
   (Loads only the extracted text, not full component)

3. Human generates audio via ElevenLabs
   Input: refined text file
   Output: audio.mp3

4. Claude integrates: Place in public/posts/<slug>/audio.mp3
```

**Context Savings**: Script processes full blog post component (5000+ words) → Outputs 3000 words of text → Claude refines 3000 words for audio (not 5000+ words of JSX)

#### When to Use Scripts vs MCP Tools

**Use TypeScript/Bash Scripts When**:

- ✅ Heavy computation (image processing, file transformations)
- ✅ Reusable by humans outside Claude Code
- ✅ Logic should be version controlled
- ✅ Needs debugging/iteration
- ✅ Composable with other scripts

**Use MCP Tools When**:

- ✅ External API integration (GitHub, Linear, databases)
- ✅ Authentication/secrets management
- ✅ Real-time data fetching
- ✅ Cross-repository operations

**Hybrid Approach in This Repository**:

- **Scripts**: Image optimization, text extraction, audio generation (local computation)
- **MCP Tools**: Playwright (browser automation), IDE diagnostics (external services)
- **Result**: Minimal MCP configuration, most automation in git-tracked scripts

### 5. Command Patterns and Workflows

#### Pattern 1: Specialized Text Refinement ([.claude/commands/refine-text.md](file:///Users/emilwareus/Development/addcommitpush.io/.claude/commands/refine-text.md))

**Purpose**: Adapt blog text for audio narration (TTS/podcast format)

**Constraint**: "90% identical to original - only fix audio-unfriendly elements"

**Transformations**:

```markdown
✅ "See the chart below" → "Consider the following data"
✅ "Click here" → "More information"
✅ "TL;DR" → "In summary"
✅ Bullet points → Flowing sentences
✅ "etc." → "and so on"

❌ Don't change author's voice
❌ Don't alter technical accuracy
❌ Don't restructure content
```

**Workflow Integration**:

```
1. pnpm extract-text <slug>           # Script extracts text
2. /refine-text                       # Command refines for audio
3. pnpm generate-audio <slug>         # Script calls ElevenLabs API
4. Output: public/posts/<slug>/audio.mp3
```

**Key Insight**: Command operates on pre-processed text (not raw JSX), minimizing context usage

#### Pattern 2: Research → Plan → Implement Chain

**Full Workflow Example** (from audio feature implementation):

```bash
# Phase 1: Research
User: "How do we serve audio files for blog posts?"
Claude: /research_codebase
  Spawns: codebase-locator, codebase-analyzer, thoughts-locator
  Output: .claude/research/2025-11-07_audio-files-blog-posts.md (754 lines)

# Phase 2: Planning
User: "Create a plan to add audio to blog posts"
Claude: /create_plan
  Reads: research document fully
  Spawns: codebase-pattern-finder (find similar implementations)
  Interactive: Asks clarifying questions
  Output: .claude/plans/audio-blog-posts-implementation.md (645 lines)

# Phase 3: Implementation
User: "Implement the plan"
Claude: /implement_plan .claude/plans/audio-blog-posts-implementation.md
  Reads: plan fully
  Executes: Each phase sequentially
  Verifies: pnpm build, pnpm lint, pnpm exec tsc --noEmit
  Updates: Checkboxes in plan file

# Phase 4: Validation
User: "Validate the implementation"
Claude: /validate_plan
  Compares: git diff to plan specifications
  Runs: Automated verification commands
  Output: Validation report with deviations/issues
```

**Timeline**: Research (5 min) → Planning (15 min) → Implementation (30 min) → Validation (5 min)

**Without Commands**: Would require single 100,000+ word context, prone to errors, no intermediate artifacts

**With Commands**: 4 focused phases, ~2000 words context each, clear deliverables at each stage

### 6. Permissions and Pre-Approval

**Configuration**: `.claude/settings.local.json`

**Strategy**: Pre-approve trusted commands to reduce friction

**Example Permissions**:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm build:*)",           # Build verification
      "Bash(pnpm lint:*)",            # Code quality checks
      "Bash(pnpm exec tsc:*)",        # Type checking
      "Bash(pnpm optimize-images:*)", # Image processing
      "Bash(pnpm extract-text:*)",    # Text extraction
      "Bash(curl:*)",                 # API testing
      "WebFetch(domain:claude.com)",  # Documentation access
      "mcp__playwright__browser_*"    # Browser automation
    ]
  }
}
```

**Benefits**:

- No permission prompts for routine operations
- Explicit allow-list (security boundary)
- Per-domain WebFetch control
- Glob patterns for command families

**Anti-Pattern**: Adding `"allow": ["*"]` (too permissive)

**Best Practice**: Add permissions incrementally as workflows stabilize

## Code References

### Commands

- `.claude/commands/create_plan.md:1-460` - Interactive plan creation
- `.claude/commands/validate_plan.md:1-177` - Implementation verification
- `.claude/commands/implement_plan.md:1-76` - Plan execution
- `.claude/commands/research_codebase.md:1-194` - Parallel research orchestration
- `.claude/commands/refine-text.md:1-77` - Text refinement for audio

### Agents

- `.claude/agents/codebase-locator.md:1-118` - File location specialist
- `.claude/agents/codebase-analyzer.md:1-136` - Implementation analysis specialist
- `.claude/agents/codebase-pattern-finder.md:1-228` - Pattern discovery specialist
- `.claude/agents/thoughts-locator.md` - Documentation discovery
- `.claude/agents/thoughts-analyzer.md` - Documentation analysis
- `.claude/agents/web-search-researcher.md` - Web research specialist

### Scripts

- `scripts/optimize-images.ts:1-192` - Image optimization automation
- `scripts/extract-post-text.ts:1-164` - Blog text extraction
- `scripts/generate-audio.ts` - TTS integration
- `scripts/check-about-links.ts` - Link validation

### Plans & Research

- `.claude/plans/audio-blog-posts-implementation.md:1-645` - 6-phase implementation plan
- `.claude/research/2025-11-07_audio-files-blog-posts.md:1-754` - Comprehensive architecture research

### Configuration

- `.claude/settings.local.json:1-49` - Permissions and pre-approvals

## Architecture Insights

### 1. Separation of Concerns

**Three Distinct Layers**:

1. **Orchestration Layer** (Commands): High-level workflows, human interaction
2. **Execution Layer** (Agents): Focused research/analysis tasks
3. **Computation Layer** (Scripts): Heavy processing outside context

**Benefit**: Each layer optimized for its role, no overlap

### 2. Context as Scarce Resource

**Traditional Approach**: Load everything into context, hope for best

**Advanced Approach**:

- Spawn sub-agents to filter and summarize
- Store findings in structured documents
- Main context only sees synthesized results
- Scripts handle computation outside context

**Analogy**: Database query optimization

- Bad: `SELECT * FROM all_tables` (context overflow)
- Good: Targeted queries with JOINs (agent orchestration)

### 3. Traceability and Reproducibility

**Every research/plan includes**:

- Git commit hash
- Branch name
- Timestamp
- Researcher (Claude Code vs human)
- Status (complete, in-progress, implemented)

**Benefit**: Can trace decision history, reproduce context at any point

**Example**:

```yaml
git_commit: 061153440c422dea14cacfca93c10eaa8d54683d
branch: main
date: 2025-11-07T00:00:00Z
```

If plan fails, can `git checkout <hash>` and understand original context

### 4. Progressive Enhancement Pattern

**Discovered Workflow**:

1. **First iteration**: Use built-in Claude Code features (no customization)
2. **Identify patterns**: Notice repetitive workflows
3. **Create command**: Document workflow in `.claude/commands/*.md`
4. **Extract agents**: Identify reusable research components → `.claude/agents/*.md`
5. **Automate computation**: Offload to scripts → `scripts/*.ts`
6. **Pre-approve**: Add to permissions → `.claude/settings.local.json`

**Real Example from This Repository**:

- Started with manual research for blog posts
- Created `research_codebase.md` command to formalize process
- Extracted `codebase-locator`, `codebase-analyzer` agents
- Built `optimize-images.ts` script for image processing
- Added `pnpm optimize-images` to pre-approved commands
- Result: Repeatable, fast workflow

### 5. Human-in-the-Loop Decision Points

**Commands include explicit user interaction**:

- Planning: Present options, ask for preferences
- Implementation: Stop when plan deviates, ask for guidance
- Validation: Separate automated vs manual verification

**Example from create_plan.md**:

```markdown
Present findings and design options:

- Option A - [pros/cons]
- Option B - [pros/cons]

Which approach aligns best with your vision?

[Wait for user input before proceeding]
```

**Benefit**: AI handles grunt work (research, file reading), human makes strategic decisions

## Workflow Examples

### Example 1: Adding a New Blog Post Feature

**Scenario**: Add audio narration to blog posts

**Step 1: Research** (`/research_codebase`)

```
User: "How can we serve audio files for blog posts?"

Claude spawns in parallel:
- codebase-locator: Find audio-related files
- codebase-analyzer: Understand AudioPlayer component
- thoughts-locator: Check for prior audio discussions

Output: .claude/research/2025-11-07_audio-files-blog-posts.md
Key Finding: AudioPlayer already exists, just needs integration
```

**Step 2: Planning** (`/create_plan`)

```
User: "Create a plan to add audio"

Claude:
1. Reads research document fully
2. Spawns codebase-pattern-finder: Find similar integrations
3. Presents approach options to user
4. User selects preferred approach
5. Writes detailed plan with 6 phases

Output: .claude/plans/audio-blog-posts-implementation.md
```

**Step 3: Implementation** (`/implement_plan`)

```
User: "Implement the plan"

Claude:
1. Reads plan fully
2. Phase 1: Add playback speed controls → Edit AudioPlayer
3. Verify: pnpm build && pnpm lint
4. Phase 2: Create audio file → Use bash script
5. Verify: File exists
6. Phase 3-6: Continue through phases
7. Update checkboxes in plan as completing

Output: All changes committed, plan marked complete
```

**Step 4: Validation** (`/validate_plan`)

```
User: "Validate the implementation"

Claude:
1. git diff to see changes
2. Compare changes to plan specifications
3. Run: pnpm build, pnpm lint, pnpm exec tsc
4. Generate validation report

Output: Confirmation all automated checks pass, list manual tests for user
```

**Total Time**: ~60 minutes (vs ~4 hours manual implementation)

### Example 2: Codebase Exploration

**Scenario**: New developer joins, needs to understand authentication

**Command**: `/research_codebase "How does authentication work?"`

**Claude's Process**:

```
1. Spawn codebase-locator:
   Find: auth middleware, session management, user models

2. Spawn codebase-analyzer:
   Analyze: Authentication flow from login to session

3. Spawn codebase-pattern-finder:
   Find: Similar auth patterns in other routes

4. Synthesize findings:
   - Entry point: app/api/auth/route.ts
   - Session storage: lib/session.ts
   - Middleware: middleware.ts:45-67
   - Pattern: JWT tokens in httpOnly cookies

5. Generate research document with architecture diagram
```

**Output**: Comprehensive research document with file:line references

**Benefit**: New developer gets architectural overview in 5 minutes vs hours of code reading

### Example 3: Pre-Commit Optimization

**Scenario**: Optimize images before committing blog post

**Workflow**:

```bash
# 1. Add source images to public/posts/my-post/
cp ~/Desktop/cover.png public/posts/my-post/

# 2. Run optimization script (pre-approved in settings)
pnpm optimize-images

# Output:
# ✓ /public/posts/my-post/cover.png (1.2MB)
#   → AVIF: 120KB (saved 90.0%)
#   → WebP: 180KB (saved 85.0%)
#   → PNG: 600KB (saved 50.0%)

# 3. Update post frontmatter to use optimized version
# cover: "/posts/my-post/cover-optimized.webp"

# 4. Commit everything
git add public/posts/my-post/
git commit -m "Add my-post with optimized images"
```

**Context Usage**: Zero tokens (entire process in bash script)

**Alternative Without Script**: Claude reads image, uses external API, manually saves variants → High context usage, slow, error-prone

## Adapting to Your Codebase

### Step 1: Start with CLAUDE.md

**Foundation**: Document your project structure and conventions

**Template**:

```markdown
## Tech Stack

- Framework: [Next.js 16, Django, Rails, etc.]
- Language: [TypeScript, Python, Ruby]
- Key directories: [app/, lib/, config/]

## Conventions

- Testing: [Jest, Pytest, RSpec]
- Code style: [ESLint, Black, Rubocop]
- Build commands: [pnpm build, make, rake]

## Workflows

- Development: [pnpm dev]
- Testing: [pnpm test]
- Deployment: [pnpm build && deploy]
```

**Reference**: This repository's [CLAUDE.md:1-180](file:///Users/emilwareus/Development/addcommitpush.io/CLAUDE.md) as example

### Step 2: Identify Repetitive Workflows

**Questions to Ask**:

- Do you repeatedly research the same type of questions?
- Do you follow a standard process for planning features?
- Do you run the same verification commands?
- Do you perform similar transformations on files?

**If yes → Create custom command**

### Step 3: Create Your First Command

**Start Simple**: Document existing workflow

**Example - Code Review Command**:

```markdown
# .claude/commands/review.md

You are tasked with reviewing code changes before committing.

## Steps:

1. Run `git diff` to see changes
2. For each file changed:
   - Check for security issues
   - Verify tests exist
   - Ensure documentation updated
3. Run verification:
   - `pnpm lint`
   - `pnpm test`
   - `pnpm exec tsc --noEmit`
4. Generate review summary:
   - Security concerns: [list]
   - Test coverage: [status]
   - Documentation: [status]
   - Recommendation: [approve/needs-work]
```

**Usage**: `/review` → Claude follows documented process

### Step 4: Extract Specialized Agents

**When to Create Agent**:

- Command spawns same type of research repeatedly
- Need focused exploration with specific tools
- Want to reduce context in main orchestration

**Agent Template**:

```markdown
---
name: my-agent
description: Finds [specific thing] in codebase
tools: Grep, Glob, Read
---

You are a specialist at [specific task].

## Responsibilities:

1. [Primary responsibility]
2. [Secondary responsibility]

## Search Strategy:

[How to find relevant code]

## Output Format:
```

[Structured output format]

```

## Important Guidelines:
- [Key constraint 1]
- [Key constraint 2]
```

### Step 5: Offload to Scripts

**When to Create Script**:

- Heavy computation (image processing, file parsing)
- Reusable by humans outside Claude
- Logic should be version controlled

**Script Template** (TypeScript with tsx):

```typescript
#!/usr/bin/env tsx

/**
 * Script Description
 * Usage: pnpm my-script <args>
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: pnpm my-script <args>');
    process.exit(0);
  }

  // Script logic
  console.log('Processing...');

  // Output results
  console.log('✅ Complete!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
```

**Add to package.json**:

```json
{
  "scripts": {
    "my-script": "tsx scripts/my-script.ts"
  }
}
```

**Pre-approve in settings**:

```json
{
  "permissions": {
    "allow": ["Bash(pnpm my-script:*)"]
  }
}
```

### Step 6: Iterate and Refine

**Continuous Improvement**:

1. Use commands/agents in real workflows
2. Identify pain points or repetition
3. Refactor commands (extract common patterns to agents)
4. Add more scripts for heavy computation
5. Update CLAUDE.md with new workflows

**Example Evolution**:

```
Week 1: Manual research → Document in CLAUDE.md
Week 2: Create /research command → Standardize process
Week 3: Extract codebase-locator agent → Reduce context
Week 4: Add optimize-images script → Offload computation
Week 5: Pre-approve commands → Remove friction
```

## Key Takeaways

### 1. Context Engineering Principles

**Core Philosophy**:

- Context engineering ≠ cramming more into prompts
- It's deliberate structuring, compacting, and aligning information
- Use sub-agents for task decomposition
- Human focus on high-leverage work: CLAUDE.md > prompts > research > plans > implementation

**Anti-Patterns to Avoid**:

- ❌ Loading entire codebase into context
- ❌ Reading files partially (use FULL reads)
- ❌ Spawning sub-agents without understanding task first
- ❌ Keeping computation in context (offload to scripts)
- ❌ No intermediate artifacts (save research, plans, validation reports)

### 2. Three-Phase Pipeline

**Research → Plan → Implement → Validate**

**Each phase**:

- Generates timestamped artifact (research doc, plan doc, validation report)
- Has clear success criteria
- Can be resumed independently
- Builds on previous phase

**Benefit**: Reproducible, traceable, interruptible workflows

### 3. Agent Orchestration

**Pattern**: Spawn multiple specialized agents in parallel

**Agent Types**:

- **Locator**: WHERE does code live? (Grep, Glob, LS)
- **Analyzer**: HOW does code work? (Read, Grep, Glob, LS)
- **Pattern Finder**: WHAT examples exist? (Grep, Glob, Read, LS)

**Context Savings**: ~98% reduction (synthesized results vs raw file reads)

### 4. Scripts Over MCP Tools

**Use Scripts When**:

- ✅ Heavy computation (image optimization, file parsing)
- ✅ Reusable by humans
- ✅ Version controlled logic
- ✅ Debugging needed

**Use MCP Tools When**:

- ✅ External API integration
- ✅ Authentication management
- ✅ Real-time data fetching

**Hybrid Approach**: Most automation in scripts, MCP for external services

### 5. Progressive Enhancement

**Path to Advanced Context Engineering**:

1. Start with CLAUDE.md (document conventions)
2. Identify repetitive workflows
3. Create custom commands
4. Extract specialized agents
5. Offload computation to scripts
6. Pre-approve trusted operations

**Don't**: Try to build everything upfront

**Do**: Evolve organically based on real usage patterns

## Open Questions

1. **Command Composition**: Can commands call other commands? (e.g., /implement_plan calls /validate_plan)
   - Research needed: Investigate command chaining patterns

2. **Agent Communication**: Can agents spawn sub-agents for deeper research?
   - Current: Agents are leaf nodes (no recursion)
   - Potential: Allow one level of sub-agent spawning for complex research

3. **Script Library**: Should common patterns (optimize-images, extract-text) be extracted to reusable npm package?
   - Pro: Share across projects
   - Con: Increased complexity, versioning concerns

4. **Automated Plan Updates**: When implementation deviates, should agent auto-update plan?
   - Current: Stops and asks user
   - Potential: Update plan automatically, commit change, resume

5. **Context Budget Enforcement**: Can agents specify max context usage before spawning?
   - Example: "Only spawn sub-agent if main context usage < 50%"
   - Benefit: Prevent context overflow

## Recommendations

### For Beginners (No Custom Setup Yet)

1. Start with `.claude/CLAUDE.md` - Document your project
2. Use existing Claude Code commands (no customization)
3. Learn patterns: What tasks are repetitive?
4. Read this research document for inspiration

### For Intermediate Users (Some Custom Setup)

1. Create 1-2 custom commands for most repetitive workflows
2. Extract 1-2 agents for focused research
3. Add 1 script for heaviest computation
4. Pre-approve trusted commands in settings
5. Use three-phase pipeline: Research → Plan → Implement

### For Advanced Users (Full Setup)

1. Build command library for all major workflows
2. Create specialized agent hierarchy
3. Extensive script automation (image, text, audio processing)
4. Pre-approve large set of operations
5. Contribute patterns back to community
6. Mentor others on context engineering

### Universal Best Practices

1. **Always read files FULLY before spawning sub-agents**
2. **Separate automated vs manual verification in plans**
3. **Store research/plans/validation as artifacts (not just in chat)**
4. **Use YAML frontmatter for metadata tracking**
5. **Pre-approve trusted operations to reduce friction**
6. **Offload computation to scripts, not MCP tools (when possible)**
7. **Spawn agents in parallel, not sequentially**
8. **Include file:line references in all findings**
9. **Test commands/agents with real workflows before committing**
10. **Document conventions in CLAUDE.md as source of truth**

## Related Research

- GitHub: [ai-that-works/ai-that-works - Advanced Context Engineering](https://github.com/ai-that-works/ai-that-works/tree/main/2025-08-05-advanced-context-engineering-for-coding-agents)
- Local: `.claude/research/2025-11-07_audio-files-blog-posts.md` - Example of comprehensive research output
- Local: `.claude/plans/audio-blog-posts-implementation.md` - Example of detailed implementation plan

## Conclusion

**Advanced context engineering with Claude Code is about systematic decomposition, not heroic prompting.**

The three-tier system (Commands → Agents → Scripts) creates a **force multiplier**:

1. **Commands** orchestrate workflows and handle human interaction
2. **Agents** perform focused research with minimal context
3. **Scripts** offload computation outside token budget

**Result**:

- 98% context reduction through agent parallelization
- Reproducible workflows through artifact generation
- Minimal friction through pre-approved operations
- Fast iteration through script automation

**The Path Forward**:

1. Document your conventions (CLAUDE.md)
2. Identify repetitive workflows
3. Create commands/agents/scripts incrementally
4. Iterate based on real usage

**This isn't about perfection - it's about progressive enhancement of your development workflow.**

Start simple. Add one command. Extract one agent. Write one script. Repeat.

Over time, you'll build a personalized AI development environment that **understands your codebase's patterns and automates your team's workflows**.

That's advanced context engineering.
