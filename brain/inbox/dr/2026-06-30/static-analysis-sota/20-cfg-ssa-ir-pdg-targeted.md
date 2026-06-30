---
title: "CFG SSA IR PDG targeted primary sources: Cytron SSA, Ferrante program dependence graph, LLVM IR, control-flow graph construction, representation tradeoffs"
generated_at: 2026-06-29T22:18:59.814182+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Control-Flow Graphs, SSA Form, and Program Dependence Graphs: Representation Tradeoffs in Compiler IRs

## Abstract

This report examines the foundational and modern tradeoffs among control-flow graphs (CFGs), static single assignment (SSA) form intermediate representations, and program dependence graphs (PDGs) as used in compilers and static analysis tooling. The intended evidence base was the canonical Cytron et al. SSA construction paper, the Ferrante et al. PDG paper, LLVM IR documentation, and recent IR/SSA/PDG literature. However, only one source was admitted to the source register, and its rendered text was largely unparseable. Consequently, this report frames the conceptual landscape and identifies what can and cannot be substantiated from the available evidence, while providing a structured analysis of the representation tradeoffs that remain open questions pending adequate source retrieval.

## Research Question

What are the canonical definitions, construction algorithms, and tradeoffs among CFGs, SSA-form IRs, and PDGs for compiler optimization, static analysis, and program slicing—and how do modern implementations such as LLVM IR, MLIR, and Cranelift operationalize or deviate from the classical formulations?

## Method

The research plan called for retrieving and analyzing primary sources spanning classical compiler theory (Cytron et al. 1991 on SSA; Ferrante, Ottenstein, and Walden 1987 on PDGs), modern implementation documentation (LLVM Language Reference, MLIR, Cranelift), and recent (2020–2026) literature on IR design, SSA variants, and PDG scalability. Sources were to be evaluated for algorithmic specificity, implementation relevance, and evidence of failure modes.

**Result of source retrieval:** Only one source was admitted to the register: the Cytron et al. SSA paper [S4]. The remaining planned sources—Ferrante et al., LLVM documentation, MLIR/Cranelift references, and recent literature—were not admitted. Furthermore, the admitted source [S4] was rendered as a garbled PDF from which only a single fragment was human-readable: "Y. The predecessor of Y on p is dominated" [S4]. This fragment is present in the source text, but its brevity and lack of surrounding context prevent any determination of what algorithmic step or concept it describes.

Given this evidence base, the report proceeds by (1) documenting what the single source fragment supports, (2) providing conceptual background framed as inferential analysis rather than source-backed claims, and (3) identifying the specific evidence gaps that must be filled before substantive findings can be asserted.

## Conceptual Background

The following concepts are central to the topic. The definitions below are framed as general compiler theory knowledge and are **not** substantiated by the admitted source register, which lacked parseable content. They are provided to orient the analysis and should be treated as unverified until corroborated by primary sources.

| Term | Working Definition | Source Status |
|------|-------------------|---------------|
| Control-Flow Graph (CFG) | Directed graph of basic blocks connected by edges representing possible control transfers (branches, falls-through). | Inference; not source-backed |
| Basic Block | Maximal sequence of instructions with no internal control transfers; single entry, single exit. | Inference; not source-backed |
| SSA Form | IR property where each variable is assigned exactly once; merge points use phi functions to select values from predecessor blocks. | Inference; not source-backed |
| Dominance | Node D dominates node N if every path from entry to N passes through D. | Inference; not source-backed |
| Dominance Frontier | Set of nodes where D's dominance stops; used to place phi nodes in SSA construction. | Inference; not extractable from [S4] |
| Program Dependence Graph (PDG) | Graph combining control dependence and data dependence edges; enables slicing and parallelization analysis. | Inference; not source-backed |
| Phi Node | SSA construct at merge points selecting among values based on which predecessor block executed. | Inference; not source-backed |
| Memory SSA | Extension of SSA to memory operations, modeling memory dependencies with virtual defs/uses. | Inference; not source-backed |

**Dominance and SSA construction.** In SSA form, the placement of phi functions is determined by dominance frontiers. A variable defined in block D requires phi functions at every node in D's dominance frontier, because those are the points where the definition's dominance ceases and a merge of competing values may occur. The single readable fragment from [S4]—"Y. The predecessor of Y on p is dominated"—is present in the source text, but the surrounding context is lost, so no determination can be made about what algorithmic step or concept this fragment describes.

**PDG construction.** A PDG is built by computing two edge types: control dependence edges (derived from the CFG and post-dominance tree) and data dependence edges (derived from def-use chains). Control dependence from node A to node B means B's execution depends on the outcome of A. Data dependence from node A to node B means B uses a value defined by A. The PDG enables program slicing: removing nodes not reachable from a slicing criterion preserves the behavior relevant to that criterion. These definitions are standard in compiler theory but are **not** substantiated by the admitted evidence.

## Findings

### What the Evidence Supports

The admitted source register contains one source [S4], identified as the Cytron et al. SSA paper. From this source, the following can be stated:

1. **Source identity confirmed.** The document is the canonical SSA construction paper by Cytron et al. [S4]. This confirms that the research pipeline located the correct primary source, even though the rendered content was inaccessible.

2. **Readable fragment present.** A single fragment—"Y. The predecessor of Y on p is dominated"—is present in the rendered text of [S4]. The fragment's brevity and garbled surrounding context preclude any determination of what algorithmic step, concept, or discussion it belongs to.

No further claims can be substantiated from the admitted source register. The following table summarizes the evidence density:

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| Cytron et al. is the canonical SSA construction source | Document title and URL identify it as such | [S4] | PDF rendering is garbled; only one fragment readable |
| Fragment "Y. The predecessor of Y on p is dominated" is present in the source text | Direct extraction from rendered PDF | [S4] | Isolated fragment; no surrounding context; cannot confirm what it describes |
| Dominance frontier algorithm places phi nodes | Not extractable | [S4] | Text unparseable |
| Ferrante et al. define PDG with control and data dependence edges | Not available | — | Source not admitted to register |
| LLVM IR uses SSA with phi nodes at basic block entries | Not available | — | LLVM Language Reference not admitted |
| Memory SSA extends SSA to memory operations with aliasing challenges | Not available | — | No source admitted for this claim |
| PDG construction has scalability limitations | Not available | — | No recent literature admitted |

### What the Evidence Does Not Establish

The evidence does not establish:

- The specific dominance frontier algorithm from Cytron et al. (the paper's text is unparseable).
- What the readable fragment from [S4] describes in terms of SSA construction algorithmic steps.
- Any details of the Ferrante et al. PDG formulation (source not admitted).
- LLVM IR's representation of CFG, SSA, or phi semantics (source not admitted).
- Deviations of LLVM IR from textbook minimal SSA (source not admitted).
- Any recent (2020–2026) advances in IR design, SSA variants, or PDG construction (no recent sources admitted).
- Any concrete failure modes or criticisms of SSA or PDG approaches (no critique sources admitted).
- Measured costs of phi placement, dominance computation, or PDG extraction (no benchmark sources admitted).

### Inferential Tradeoff Analysis

The following tradeoff comparison is provided as **inferential analysis** based on general compiler theory knowledge, not as source-backed findings. It should be treated as a framework for future investigation rather than established evidence.

| Dimension | CFG + SSA | PDG |
|-----------|----------|-----|
| Construction cost | Moderate; dominance computation + phi placement | Higher; requires CFG + post-dominance + def-use analysis |
| Optimization granularity | Instruction-level within basic blocks; data flow via def-use | Statement-level across dependence edges |
| Slicing support | Indirect; requires additional analysis | Direct; reachability from slicing criterion |
| Parallelization analysis | Indirect; requires dependence testing | Direct; independent subgraphs indicate parallelism |
| Memory modeling | Extended via Memory SSA (aliasing challenges) | Data dependence requires alias analysis; same challenge |
| Scalability | Well-understood; linear-ish in practice for SSA | Potential blowup with dense data dependence edges |
| Irreducible CFG handling | Requires cycle equivalence or node splitting | Control dependence computation complicated by irreducibility |
| Tooling maturity | LLVM, GCC, Cranelift all use CFG+SSA | Less common in production; more common in research/slicing tools |

**Insight:** The tradeoff between CFG+SSA and PDG representations is fundamentally about what question the analysis asks. CFG+SSA optimizes for efficient data-flow analysis within a structured control flow, while PDG optimizes for dependence-based queries like slicing and parallelization. Modern compilers overwhelmingly favor CFG+SSA because optimization passes are naturally expressed as local transformations on basic blocks and def-use chains, whereas PDG construction adds an intermediate representation layer that must be kept consistent with the CFG. This inference is not source-backed.

## Design Implications

Given the evidence limitations, design implications are framed as conditional guidance pending source verification:

1. **For SSA construction:** A coding agent implementing SSA should compute dominance frontiers to place phi nodes. The standard approach involves building a dominator tree, computing dominance frontiers, and inserting phi functions at frontier nodes for each variable defined in a dominating block. The specific algorithm is attributed to Cytron et al. [S4], but the details could not be extracted from the available rendering.

2. **For LLVM IR consumption:** LLVM IR uses SSA form with phi instructions at the start of basic blocks. Phi nodes list (value, basic-block) pairs for each predecessor. A coding agent parsing LLVM IR should handle phi nodes before any other instruction in a block and resolve values based on the actual predecessor. This is inferential; the LLVM Language Reference was not admitted as a source.

3. **For PDG-based analysis:** A coding agent building a PDG should compute control dependence from the post-dominance tree and data dependence from def-use chains (or alias analysis for memory). The PDG enables slicing by computing reachability from a slicing criterion. This is inferential; the Ferrante et al. source was not admitted.

4. **For representation choice:** If the analysis task is optimization (constant propagation, dead code elimination, loop transformations), CFG+SSA is the standard substrate. If the task is slicing, impact analysis, or parallelization detection, a PDG may be more direct but incurs higher construction cost. This is inferential.

## Limitations and Threats to Validity

**Severe evidence gap.** The primary threat to validity is that only one source was admitted to the register, and that source was rendered as a garbled PDF. The following specific limitations apply:

- **Unparseable primary source.** The Cytron et al. paper [S4] could not be read beyond a single fragment. No algorithmic details, pseudocode, complexity analysis, or empirical results could be extracted. Any claims about the dominance frontier algorithm, phi placement strategy, or SSA construction cost are unverified.

- **Uninterpretable fragment.** The single readable fragment from [S4]—"Y. The predecessor of Y on p is dominated"—is present in the text but cannot be associated with any specific algorithmic step or concept due to the loss of surrounding context.

- **Missing classical source.** The Ferrante et al. 1987 PDG paper was not admitted. All claims about PDG construction, control/data dependence edges, and slicing semantics are unverified.

- **Missing implementation documentation.** LLVM Language Reference, MLIR documentation, Cranelift documentation, and GCC GIMPLE references were not admitted. All claims about how modern compilers represent CFG, SSA, or phi semantics are unverified.

- **Missing recent literature.** No 2020–2026 sources were admitted. The research plan's recency criterion is unmet.

- **Missing critique sources.** No sources addressing PDG scalability, Memory SSA aliasing challenges, irreducible CFG handling, or correctness gaps were admitted. The plan's requirement to surface at least two concrete failure modes is unmet.

- **Inferential content.** The conceptual background, tradeoff table, and design implications sections contain inferential analysis based on general compiler theory knowledge, not on the admitted source register. This content should be treated as a framework for investigation, not as established findings.

- **Stale evidence risk.** Even if [S4] were fully parseable, it is a 1991 paper. SSA construction techniques have evolved; relying solely on this source would risk stale guidance even in the best case.

## Open Questions

1. **What is the exact dominance frontier algorithm in Cytron et al.?** The paper [S4] was located but unparseable. Retrieving a readable rendering (e.g., from the ACM Digital Library or a clean PDF) is necessary to confirm the algorithmic details.

2. **What does the readable fragment from [S4] describe?** The fragment "Y. The predecessor of Y on p is dominated" is present in the source text, but its surrounding context is lost. A parseable rendering of the paper is needed to determine what algorithmic step or concept this fragment belongs to.

3. **How does LLVM IR deviate from textbook minimal SSA?** LLVM may insert phi nodes beyond the minimal set required by dominance frontiers, or may handle undefined values, unreachable blocks, and memory in ways that differ from the classical formulation. This requires the LLVM Language Reference as a source.

4. **What are the measured costs of PDG construction at scale?** PDG edge density can grow quadratically with program size in pathological cases. Empirical data on PDG construction cost for real-world programs is needed.

5. **How do modern compilers handle Memory SSA and aliasing?** Memory SSA extends SSA to memory operations but requires alias analysis, which is undecidable in general. The practical approximations and their failure modes need documentation.

6. **What recent work (2020–2026) revisits IR design?** MLIR's multi-level SSA, Cranelift's regalloc-aware IR, and any new SSA variants or PDG construction algorithms need to be surveyed from admitted sources.

7. **How are irreducible CFGs handled in SSA and PDG construction?** Irreducible CFGs (with multiple-entry loops) complicate dominance computation and control dependence. The specific mitigations (node splitting, cycle equivalence) need source-backed documentation.

## Recommended Next Experiments

1. **Re-retrieve the Cytron et al. paper in a parseable format.** Attempt retrieval from the ACM Digital Library (DOI-based), Google Scholar, or an alternative PDF host. Verify that the extracted text contains the dominance frontier algorithm pseudocode and complexity analysis. This is the highest-priority experiment because [S4] is the only admitted source and is currently unusable.

2. **Retrieve and admit the Ferrante et al. 1987 PDG paper.** Search for "The Program Dependence Graph and Its Use in Optimization" (TOPLAS 1987). Extract the definitions of control dependence, data dependence, and the PDG construction algorithm. This fills the largest gap in the evidence base.

3. **Retrieve and admit the LLVM Language Reference Manual.** Extract the formal semantics of phi nodes, basic blocks, terminator instructions, and SSA requirements. Document any deviations from minimal SSA (e.g., handling of unreachable blocks, undefined values, or non-canonical phi placement).

4. **Retrieve and admit at least one recent (2020–2026) source on IR design or SSA/PDG advances.** Candidates include MLIR documentation, Cranelift IR design documents, or recent PLDI/CGO papers on SSA construction or PDG scalability. This addresses the recency criterion.

5. **Retrieve and admit sources on Memory SSA and aliasing limitations.** LLVM's MemorySSA documentation or published critiques of memory dependence analysis would address the failure-mode requirement. At least two concrete failure modes should be documented with source backing.

6. **Construct a comparative evidence table once sources are retrieved.** Map each claim (dominance frontier algorithm, phi semantics, PDG construction, failure modes) to specific source passages. This enables the structured tradeoff analysis the current evidence base cannot support.

## Source Register

- [S1] [CS 426 Topic 4: SSA and the SSA Construction Algorithm](https://piazza.com/class_profile/get_resource/hzkq9i9o1ec222/i08j0jat3m63mh) — rejected, score 9, discovered by `Cytron 1991 efficient SSA construction dominance frontier algorithm`
- [S2] [(PDF) Efficiently Computing Static Single Assignment Form and the Control Dependence Graph](https://www.researchgate.net/publication/213879567_Efficiently_Computing_Static_Single_Assignment_Form_and_the_Control_Dependence_Graph) — rejected, score 19, discovered by `Cytron 1991 efficient SSA construction dominance frontier algorithm`
- [S3] [1 UNIVERSITY NIVERSITY OF OFMASSACHUSETTS, ASSACHUSETTS, AMHERST](https://people.cs.umass.edu/~emery/classes/cmpsci710-spring2003/lecture07-moressa.pdf) — rejected, score 9, discovered by `Cytron 1991 efficient SSA construction dominance frontier algorithm`
- [S4] [An Efficient Method of Computing Static Single Assignment Form Ron Cytron*](https://c9x.me/compile/bib/ssa.pdf) — admitted, score 19, discovered by `Cytron 1991 efficient SSA construction dominance frontier algorithm`
- [S5] [Static single-assignment form - Wikipedia](https://en.wikipedia.org/wiki/Static_single-assignment_form) — rejected, score 11, discovered by `Cytron 1991 efficient SSA construction dominance frontier algorithm`

## Research Trace

### Goal

Synthesize the foundational and modern tradeoffs among control-flow graphs, SSA-form intermediate representations, and program dependence graphs as used in compilers and static analysis tooling.

### Subquestions

- What are the canonical definitions and construction algorithms for CFG, SSA form, and PDG, per Cytron/Ferrante and successors?
- How does LLVM IR represent CFG and SSA, and what are its explicit deviations from textbook minimal SSA?
- What are the tradeoffs between CFG-based and PDG-based analyses for optimization, slicing, and parallelization?
- How are phi nodes, dominance frontiers, and unreached block handling implemented in modern compiler pipelines?
- What criticisms or failure modes exist for SSA and PDG approaches (e.g., memory SSA, aliasing, irreducible CFGs, PDG scalability)?
- What recent (2020-2026) work revisits IR design, SSA variants, or PDG construction for performance or correctness?

### Research Perspectives

- **Primary classical sources** — Anchor definitions and algorithms in Cytron SSA, Ferrante PDG, and dominance literature.
- **Modern implementation** — Map theory to LLVM IR, MLIR, Cranelift, and GCC GIMPLE construction realities.
- **Representation tradeoffs** — Compare CFG-SSA vs PDG for optimization, slicing, and analysis cost.
- **Benchmarks and evaluation** — Find measured costs of phi placement, dominance computation, and PDG extraction.
- **Criticism and counterevidence** — Surface limitations: irreducible CFGs, memory SSA, aliasing, PDG size blowup, correctness gaps.
- **Recency and operational implications** — Identify 2020-2026 IR/SSA/PDG advances and practical guidance for compiler engineers.

### Source Requirements

- Cytron et al. 1991 SSA paper (POPL/TOPLAS)
- Ferrante, Ottenstein, Walden 1987 PDG paper (TOPLAS)
- LLVM Language Reference Manual (IR, CFG, phi semantics)
- LLVM source/docs on DominatorTree, SSAUpdater, MemorySSA
- MLIR and Cranelift IR documentation for alternative SSA representations
- Recent compiler/PLDI/CGO papers on SSA, PDG, or IR design (2020-2026)
- Critiques or benchmarks of PDG scalability and SSA memory modeling

### Success Criteria

- Cites Cytron and Ferrante primary papers with specific algorithm names (dominance frontier, PDG construction).
- Explains LLVM IR SSA/phi semantics with doc references and notes deviations from minimal SSA.
- Provides a structured tradeoff table of CFG-SSA vs PDG across optimization, slicing, and construction cost.
- Includes at least one recent (2020-2026) source on IR/SSA/PDG advances.
- Surfaces at least two concrete failure modes or criticisms with evidence.
- Gives operational guidance for a coding agent implementing or consuming these representations.

### Search Queries

- `Cytron 1991 efficient SSA construction dominance frontier algorithm` — Locate the canonical SSA primary source and construction algorithm details. [Primary classical sources / academic_paper]
- `Ferrante Ottenstein Walden program dependence graph 1987 TOPLAS` — Retrieve the foundational PDG paper defining control and data dependence edges. [Primary classical sources / academic_paper]
- `LLVM IR language reference phi nodes basic blocks control flow` — Obtain official LLVM IR semantics for CFG and SSA representation. [Modern implementation / official_docs]
- `program dependence graph scalability limitations memory SSA aliasing 2022` — Find recent critiques and failure modes of PDG and SSA memory modeling. [Criticism and counterevidence / research_paper]

### Source Quality

- [S1] Course lecture slides on SSA construction; covers the algorithm but is a tertiary summary with low authority and unreadable binary PDF. Not a primary source and does not add independent value beyond the canonical paper. score=9 type=other admitted=false warnings=PDF content is binary and not fully readable; Source is a course resource, not a primary or refereed publication
- [S2] Canonical primary source for SSA construction and control dependence graph by Cytron et al. Essential for the research goal despite fetch error. Authority and relevance are maximal; freshness is adequate for a foundational paper. score=19 type=paper admitted=false warnings=Fetch error (HTTP 403); content not directly accessible but the paper's identity and importance are well-established; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S3] University lecture slides on SSA; provides overview but is a low-authority summary with unreadable PDF content. Does not meet the need for primary or authoritative sources. score=9 type=other admitted=false warnings=PDF content is binary and not fully readable; Source is a lecture slide, not a primary publication
- [S4] Full PDF of the original Cytron et al. 1991 SSA paper, a primary source required by the research plan. Provides the definitive algorithm for SSA construction via dominance frontiers. score=19 type=paper admitted=true warnings=PDF may require specific viewer to parse; content appears complete
- [S5] Wikipedia article on SSA; provides a useful summary and references but is a tertiary source with limited authority. Does not add independent evidence beyond the primary papers and is not a primary source as required. score=11 type=other admitted=false warnings=Encyclopedic source, not authoritative for deep technical details; May contain simplifications or errors

### Evidence Notes

- [S4] The source is the canonical Cytron SSA paper but the provided text is a garbled PDF with minimal readable content. Evidence: Only fragment 'Y. The predecessor of Y on p is dominated' is human-readable; the rest is PDF binary data. Limitations: Source text is unparseable; cannot extract dominance frontier algorithm, phi placement, or other concrete details from this rendering.

### Claim Verification

- **supported**: Source identity confirmed: the document is the canonical SSA construction paper by Cytron et al. — The source title and URL confirm it is the canonical SSA paper by Cytron et al., and the evidence notes explicitly state that the source is the canonical Cytron SSA paper.
- **supported**: A single fragment 'Y. The predecessor of Y on p is dominated' is present in the rendered text of [S4]. — The evidence notes confirm that the only human-readable fragment from the garbled PDF is 'Y. The predecessor of Y on p is dominated', and the source excerpt shows PDF binary data with no other readable text, supporting the claim.

### Final Evaluation

- coverage: 2/5
- citation_quality: 1/5
- factuality: 4/5
- analysis_depth: 2/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Honest and transparent about severe evidence limitations, clearly distinguishing inferential content from source-backed claims.
- Structured report with clear sections, a tradeoff table, and well-defined open questions that guide future investigation.
- Provides a useful framework for understanding the representation tradeoffs even without primary source access.

Weaknesses:
- Only one source admitted (Cytron 1991), and that source was garbled and unparseable, leaving the vast majority of the research plan unsupported.
- Fails to meet multiple success criteria: no Ferrante citation, no LLVM documentation, no recent (2020-2026) sources, no concrete failure modes with evidence, and no operational guidance grounded in primary sources.
- The report reads more as a meta-analysis of evidence gaps rather than a synthesis of the targeted topic; substantive algorithmic details and tradeoffs are missing.

Follow-up recommendations:
- Re-retrieve the Cytron et al. 1991 SSA paper from a clean, parseable source (e.g., ACM Digital Library) to extract the dominance frontier algorithm and phi placement details.
- Retrieve and admit the Ferrante et al. 1987 PDG paper to establish control/data dependence definitions and construction algorithms.
- Retrieve the LLVM Language Reference Manual and at least one recent (2020-2026) source on IR/SSA/PDG advances to meet the recency and implementation documentation criteria.
- Obtain sources on Memory SSA, PDG scalability, and irreducible CFG handling to surface concrete failure modes and criticisms as required.
