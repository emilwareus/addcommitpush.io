---
name: implement-plan
description: Implement an approved technical plan phase by phase, verify each phase with repo-native commands, and tick the matching Execution Status row. Use when the user invokes /implement-plan, $implement-plan, or asks to implement a plan.
---

# Implement Plan

You are tasked with implementing an approved technical plan from {{PLANS_DIR}}. These plans contain phases with specific changes and success criteria.

Treat text after the skill invocation as arguments (plan path, phase number).

## Getting Started

When given a plan path:

- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully**: never use limit/offset parameters, you need complete context
- Read the relevant guidance before implementing: root {{AGENTS_FILE}}, and for each touched service its guides from {{SERVICE_GUIDES}} (agent instructions first; architecture, code-pattern, and testing guides when the phase touches architecture, implementation patterns, or tests)
- Think deeply about how the pieces fit together
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:

- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:

- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:

  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

When running under `develop-issue`, a mismatch that needs a material user answer becomes a question under `### Implementation Questions` in the owning phase, following the question contract.

## Verification Approach

After implementing a phase:

- Run the smaller repo-native commands from the phase first for fast feedback while implementing
- Then run the service-level validation command when relevant:
  - `{{CHECK_COMMAND}}` for the touched service
  - `{{E2E_COMMAND}}` when the phase changes a user-facing flow that should be verified end-to-end
- Fix any issues before proceeding. Warnings are failures.
- When a phase introduces a new shared helper, contract, or pattern in a shared package (or any package the architecture docs treat as a source of truth), update the owning architecture topic doc listed in {{ARCHITECTURE_GUIDE}} in the same phase with the helper's contract and a short usage example. A new shared helper that is not documented there is incomplete
- Update your progress in both the plan and your todos
- Check off completed items in the plan file itself

Don't let verification interrupt your flow: use small commands during implementation, then batch the heavier service-level validation at natural stopping points.

## If You Get Stuck

When something isn't working as expected:

- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly, mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing checkmarks:

- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.

## Execution Status Tick-Off

If a plan path was provided AND that plan has a `## Execution Status` section, flip the matching `- [ ]` line to `- [x]` as the last step before returning, and only after the stage has succeeded. The stage key to tick is `phase-N: implement` where N is the phase number being implemented. If no plan is provided or the plan has no Execution Status section, skip this step entirely.
