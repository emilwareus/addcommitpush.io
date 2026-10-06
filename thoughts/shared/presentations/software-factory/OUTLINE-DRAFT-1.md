# Engineering the AI Software Factory

**Draft 1 · 5 October 2026**

- Audience: developers, solution architects, engineering managers.
- Format: 45 minutes. English slide copy, matching previous decks.
- Main point: engineers build the conditions that let agents deliver useful changes.
- Audience outcome: a concrete starting point for their own repository.
- Background and evidence: [CONTEXT.md](CONTEXT.md).

## 1. Engineering the AI Software Factory · 1 min

- Our team, our product, one feature request.
- The result we want: a useful, reviewable change.
- **Show:** one ticket beside the resulting product change. Case still to select.

## 2. Engineers build the delivery system · 3 min

- Product owners define the problem and expected behavior.
- Engineers own architecture, checks and release decisions.
- **Show:** team roles around one feature. Use our actual team, not a staffing forecast.

## 3. A coding agent works in a loop · 2 min

- Orient, retrieve, edit, verify.
- Each step needs useful context and feedback.
- **Show:** the loop from “Write Code That AI Agents Love,” simplified to one visual.

## 4. dev5 separates work into reviewable stages · 4 min

- Research and plan. Implement and validate each phase.
- Code review, security review, PR ready for human review.
- **Show:** the actual dev5 stages and their output artifacts. Release sits outside this pipeline.

## 5. The repository supplies the working context · 4 min

- AGENTS.md points to commands and the architecture map.
- Owned modules, clear names, local examples.
- **Show:** one short instruction and the real files it leads to.

## 6. Skills make engineering tasks repeatable · 3 min

- A task has an input, a procedure and an output.
- A fresh stage reads a concise handoff.
- **Show:** one research or validation skill beside its actual output.

## 7. Tools expose the working contracts · 4 min

- Repo commands and API scripts work across agent tools.
- Generated SDKs expose typed product contracts.
- **Show:** one real command, its output and its permission boundary. Explain our MCP trade-offs briefly.

## 8. Tests check behavior across real boundaries · 4 min

- Component tests exercise the service and its owned infrastructure.
- Success, denied access and invalid input need observable assertions.
- **Show:** one test and the behavior it checks. Small test-boundary diagram beside it.

## 9. Repository rules make recurring checks executable · 4 min

- Polint checks concrete conventions and forbidden imports.
- Review rules flag changes that need deeper judgment.
- **Show:** one real diagnostic and its repair. A named auth subtest alone does not prove authorization.

## 10. One feature through the factory · 8 min

- Ticket, research, plan, patch, tests, review.
- One concrete mistake caught and corrected.
- **Show:** a real completed case, then its visible result. Verify the full evidence chain before selecting it.

## 11. Corrections improve a specific part of the factory · 5 min

- Trace the correction to requirements, research, planning or code.
- Update the smallest useful rule, skill or source document.
- **Show:** one correction and its durable prevention. Human code corrections are a pipeline metric, not a ban on human review.

## 12. A first rollout can stay small · 3 min

- One repository, one owned feature, explicit acceptance checks.
- Measure human corrections, review effort and escaped defects.
- **Show:** a short pilot checklist. Keep existing release ownership.

## Questions

- Use the remaining first-hour time if the final agenda allows it.
- Which repository would make a good first trial?
- What would the team need to trust its first completed change?

## Next decisions

- Select one feature with a complete, readable evidence chain.
- Select one real correction for the learning section.
- Confirm talk language and the time available for questions.

## Later slide work

- One point and one useful visual per slide.
- Short visible copy. Full technical depth stays in examples.
- No animations or click-in steps, following the presentation folder guidance.
- Use the existing browser presentation system after the outline is agreed.
