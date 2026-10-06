# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why. Issue: {{ISSUE_PREFIX}}-123.]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the end state after this plan is complete, and how to verify it]

### Key Discoveries:

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## Existing Contracts To Protect

- [Existing test, behavior, or interface that must remain green]

## What We're NOT Doing

- [Out-of-scope item]

## Decision Resolution

- Q1 (from research): [question] Answer: a. [Resolution detail]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]

**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

### Tests to Add or Update

- [Tests added in this phase and the behavior they prove, or why none are needed]

### Implementation Questions

None.

### Success Criteria:

#### Automated Verification:

- [ ] Fast targeted tests pass: `{{TEST_COMMAND}}` scoped to the touched package
- [ ] Service validation passes: `{{CHECK_COMMAND}}`

#### Manual Verification:

- [ ] [Specific manual check]

---

## Phase 2: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]

**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

### Tests to Add or Update

- [Tests added in this phase]

### Implementation Questions

None.

### Success Criteria:

#### Automated Verification:

- [ ] Service validation passes: `{{CHECK_COMMAND}}`
- [ ] E2E passes when the flow is user-facing: `{{E2E_COMMAND}}`

#### Manual Verification:

- [ ] [Specific manual check]

---

## Cross-Phase Validation

- [Only validation that genuinely needs several phases complete]

## References

- Issue: `{{ISSUE_PREFIX}}-123`
- Research: `{{RESEARCH_DIR}}/[research-file].md`
- Similar implementation: `[file:line]`

## Execution Status

<!-- machine-managed; updated by the stage skills and the develop-issue orchestrator. Do not hand-edit. -->

- [ ] phase-1: implement
- [ ] phase-1: validate
- [ ] phase-1: commit-pr
- [ ] phase-2: implement
- [ ] phase-2: validate
- [ ] phase-2: commit-pr
- [ ] post: review-and-fix
- [ ] post: review-validate
- [ ] post: review-commit-pr
- [ ] post: security-review
- [ ] post: security-validate
- [ ] post: security-commit-pr
- [ ] finalize: pr-description
- [ ] finalize: issue-update
