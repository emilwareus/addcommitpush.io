---
name: validate-plan
description: Validate that an implementation plan phase or checkpoint was correctly executed, run every success criterion, report deviations and risks, and (only when explicitly granted fix authority) repair branch-caused blockers. Use when the user invokes /validate-plan, $validate-plan, or asks to validate an implementation plan.
---

# Validate Plan

You are tasked with validating that an implementation plan was correctly executed, verifying all success criteria, and identifying any remaining deviations or risks.

Treat text after the skill invocation as arguments (plan path, phase or checkpoint, fix authority).

By default, this skill is report-only.
Only start fixing issues when the prompt explicitly asks you to fix blockers, repair validation failures, or otherwise make code changes as part of validation.

## Initial Setup

When invoked:

1. **Determine context**: are you in an existing conversation or starting fresh?

   - If existing: Review what was implemented in this session
   - If fresh: Need to discover what was done through git and codebase analysis

2. **Locate the plan**:

   - If plan path provided, use it
   - Otherwise, search recent commits for plan references or ask user

3. **Gather implementation evidence**:

   ```bash
   # Check recent commits
   git log --oneline -n 20
   git diff HEAD~N..HEAD  # Where N covers implementation commits

   # Run relevant comprehensive checks
   {{CHECK_COMMAND}}
   ```

   Use the checks that match the areas changed by the implementation:
   - run `{{CHECK_COMMAND}}` for each touched service
   - flows with meaningful end-to-end impact: also run `{{E2E_COMMAND}}`
   - if several services changed, run each service's check
   - use smaller repo-native commands first for faster feedback, then run the service-level checks above
   - if finer-grained control is needed, inspect the repository's task runner files (for example `Makefile`, `package.json` scripts) and choose the smallest correct repo-native commands
   - read the relevant guidance before validating: root {{AGENTS_FILE}}, and for each touched service its guides from {{SERVICE_GUIDES}} (architecture, code-pattern, and testing guides when they are relevant to the validation)

## Validation Process

### Step 1: Context Discovery

If starting fresh or need more context:

1. **Read the implementation plan** completely
2. **Identify what should have changed**:

   - List all files that should be modified
   - Note all success criteria (automated and manual)
   - Identify key functionality to verify

3. **Spawn parallel research tasks** to discover implementation (use **codebase-locator**, **codebase-analyzer**, and **codebase-pattern-finder**):

   ```
   Task 1 - Verify database changes:
   Research if migration [N] was added and schema changes match plan.
   Check: migration files, schema version, table structure
   Return: What was implemented vs what plan specified

   Task 2 - Verify code changes:
   Find all modified files related to [feature].
   Compare actual changes to plan specifications.
   Return: File-by-file comparison of planned vs actual

   Task 3 - Verify test coverage:
   Check if tests were added/modified as specified.
   Run test commands and capture results.
   Return: Test status and any missing coverage
   ```

### Step 2: Systematic Validation

For each phase in the plan:

1. **Check completion status**:

   - Look for checkmarks in the plan (- [x])
   - Verify the actual code matches claimed completion

2. **Run automated verification**:

   - Execute each command from "Automated Verification"
   - Document pass/fail status
   - If failures or warnings appear, investigate root cause
   - Run smaller repo-native commands first when they give faster feedback on the current phase
   - Then run the service-level validation commands: `{{CHECK_COMMAND}}` for each touched service, and `{{E2E_COMMAND}}` when end-to-end validation is relevant to the changed flow
   - If the plan needs more granular verification, inspect the task runner files to choose more targeted commands

3. **Assess manual criteria**:

   - List what needs manual testing
   - Provide clear steps for user verification

4. **Think deeply about edge cases**:
   - Were error conditions handled?
   - Are there missing validations?
   - Could the implementation break existing functionality?
   - For external/provider-integration plans, does every external API call match a real documented endpoint, read only fields the provider actually returns, and use a credential with the required scopes? Flag any call built on an unverified or fabricated capability (for example an ID the install/auth response never returns) as a blocker, not a passing phase. Does the plan include a re-verify-the-live-contract step before encoding field sets, pin each field's unit/format to one authoritative value (for example `delay` in seconds vs milliseconds), and mark provider fields the live endpoint may not return as optional rather than required? Treat a plan that bakes in a stale or ambiguous field/unit/enum as a blocker.
   - For a new capability (tool, integration action, mode), does the plan enumerate every registration/wiring surface across backend **and** frontend? A capability wired only on the backend is half-wired; flag the missing surface.
   - For integration removal/deprovision lifecycles, does a provider-originated uninstall skip duplicate provider cleanup while a user-initiated delete still runs it? Confirm the provider-vs-actor distinction is carried as an explicit signal and set correctly by every provider sharing the generic path.

### Step 3: Optional Repair Pass

Only if the prompt explicitly asks you to fix blockers:

- make the smallest correct fix for the blocking issue
- re-run the relevant validation commands
- confirm the failure is actually resolved
- stop only when the changed scope is green or when you have a clear residual blocker to report

### Step 4: Generate Validation Summary

Create a concise validation summary:

```markdown
## Validation Report: [Plan Name]

### Implementation Status

PASS Phase 1: [Name] - Fully implemented
PASS Phase 2: [Name] - Fully implemented
PARTIAL Phase 3: [Name] - Partially implemented (see issues)

### Automated Verification Results

PASS Fast targeted checks pass for the changed phase
PASS Service validation passes: `{{CHECK_COMMAND}}`
PASS E2E passes when relevant: `{{E2E_COMMAND}}`

### Code Review Findings

#### Matches Plan:

- Database migration correctly adds [table]
- API endpoints implement specified methods
- Error handling follows plan

#### Deviations from Plan:

- Used different variable names in [file:line]
- Added extra validation in [file:line] (improvement)

#### Potential Issues:

- Missing index on foreign key could impact performance
- No rollback handling in migration

### Manual Testing Required:

1. UI functionality:

   - [ ] Verify [feature] appears correctly
   - [ ] Test error states with invalid input

2. Integration:
   - [ ] Confirm works with existing [component]
   - [ ] Check performance with large datasets

### Recommendations:

- Fix any remaining warnings before merge
- Consider adding integration test for [scenario]
- Document new API endpoints
```

## Working with Existing Context

If you were part of the implementation:

- Review the conversation history
- Check your todo list for what was completed
- Focus validation on work done in this session
- Be honest about any shortcuts or incomplete items

## Important Guidelines

1. **Be thorough but practical**: focus on what matters
2. **Run all automated checks**: don't skip verification commands
   - Prefer `{{CHECK_COMMAND}}` when it matches the changed scope
   - Add `{{E2E_COMMAND}}` when the changed flow should be validated end-to-end
   - Use smaller repo-native commands first for faster feedback, then confirm with the full service-level checks
   - For narrower validation, understand the available repo-native commands from the task runner files
   - Validation is not green if any errors or warnings remain
3. **Default to report-only**: do not start editing code unless the prompt explicitly asks you to fix blockers
4. **When explicitly asked to fix, fix blockers**: make the smallest correct repair and re-run validation
5. **Document everything**: both successes and issues
6. **Think critically**: question if the implementation truly solves the problem
7. **Consider maintenance**: will this be maintainable long-term?

## Validation Checklist

Always verify:

- [ ] All phases marked complete are actually done
- [ ] If the plan persists a record overlapping an existing table/model (logs, traces, events, audit rows), it records an explicit extend-vs-new-table decision and does not introduce a parallel table + legacy fallback where the existing model could be extended
- [ ] Cross-cutting requirements (redaction, sanitization, bounding, sequence, status) are applied to every write/emit path of the affected concept, not just one
- [ ] Automated tests pass
- [ ] Automated validation is warning-free
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear

The validation works best after commits are made, as it can analyze the git history to understand what was implemented. If the prompt explicitly asks for fixes, you may repair blocking issues in the working tree; otherwise, return the report only.

Remember: Good validation catches issues before they reach production. Be constructive but thorough in identifying gaps or improvements.

## Execution Status Tick-Off

If a plan path was provided AND that plan has a `## Execution Status` section, flip the matching `- [ ]` line to `- [x]` as the last step before returning, and only after the stage has succeeded. The stage key to tick is the matching `validate` key for the checkpoint being validated (for example `phase-1: validate`, `post: review-validate`, or `post: security-validate`). If no plan is provided or the plan has no Execution Status section, skip this step entirely.
