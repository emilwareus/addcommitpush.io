# Question And Hard Return Contract

Ask only when evidence cannot safely resolve a decision that can materially
change product behavior, public compatibility, persisted customer data,
privacy/security, external side effects, or the intended PR boundary. Resolve
routine technical choices from code, architecture documents, tests, issue
history, and existing patterns.

## Required question shape

Use this form in the owning artifact:

```markdown
Q1. <One standalone question ending in ?>
Answer: <letter> <!-- add only after the user answers -->
Context: <Minimum context and implementation impact.>
Research checked: <Exact files, docs, issue history, or commands checked.>
Why this requires user input: <Why evidence cannot choose safely.>
Default if unanswered: a
Options:
a. [Recommended] <Choice and impact.>
b. <Choice and impact.>
```

Number questions in order. Use one-line options labeled `a.`, `b.`, and so on.
Provide exactly one `[Recommended]` option. The default must match it. The
default is context for the user; this workflow must not select it automatically.

## Artifact placement

- Research question: `## Open Questions` in the research document.
- Planning question: `## Open Questions` in the draft plan.
- Implementation, validation, review, security, PR, or CI question:
  `### Implementation Questions` inside the relevant `## Phase N: ...`.

For a cross-phase question, place it in the phase that owns the affected source
of truth and state which later phases it blocks.

## Hard return

After writing and structurally validating the question:

1. stop all agents for later stages;
2. do not edit implementation files;
3. do not commit, push, mutate a PR, or write to the issue tracker;
4. return a final response that gives the artifact path and repeats the question
   and options concisely;
5. end the turn completely.

Do not continue later in the same turn, even when a recommended default exists.
For an implementation question, inspect the phase block and confirm that all
required labels and sequential options are present before the return.

## Resume from an answer

Treat the next user message as an answer only when it identifies the question
and selected option or gives an unambiguous written choice. Then:

1. add `Answer: <letter>` to the exact question block;
2. add a short `Resolution:` with any useful detail from the user's response;
3. for research, run
   `bash {{SCRIPTS_DIR}}/validate-research-structure.sh <path> --require-answers`;
4. for planning, move answered decisions to `## Decision Resolution` and remove
   the unresolved `## Open Questions` section before final plan validation;
5. for implementation, keep the answered question under its phase as durable
   context;
6. resume from the stage that raised the question.

If the answer is ambiguous, update no code and return again with the minimum
clarification needed.
