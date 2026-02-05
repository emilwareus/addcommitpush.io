# Deep Research Benchmarks

## Performance Metrics and Evaluation Frameworks

---

## DeepResearch Bench

The comprehensive benchmark for evaluating Deep Research Agents.

**Leaderboard:** https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
**Documentation:** https://deepresearch-bench.github.io/

### Dataset Composition

- **100 PhD-level research tasks**
- Designed by domain experts
- Covers multiple domains:
  - Science & Technology
  - Finance & Business
  - Software Engineering
  - Other specialized fields

### Evaluation Dimensions

Two primary frameworks:
1. **RACE** - Report quality evaluation
2. **FACT** - Citation quality evaluation

---

## RACE Framework (Report Quality)

RACE evaluates the quality of generated research reports through four dimensions:

### 1. Comprehensiveness

**Definition:** Coverage breadth and depth of the research topic

**Measures:**
- Did the report address all aspects of the research question?
- Are there significant gaps in coverage?
- Is the depth of analysis appropriate?

**Connection to Diffusion:** Measures "information gap" closing

### 2. Insight / Depth

**Definition:** Quality, originality, logic, and value of analysis

**Criteria:**
- Does the report provide novel insights?
- Is the reasoning logical and well-structured?
- Does it go beyond surface-level information?

**Connection to Diffusion:** Insightfulness rules (granular breakdown, mapping tables, nuanced discussion)

### 3. Instruction Following

**Definition:** Adherence to task requirements and constraints

**Measures:**
- Did the report follow the specific instructions given?
- Are formatting requirements met?
- Are scope constraints respected?

### 4. Readability

**Definition:** Clarity of structure, fluency, and ease of understanding

**Measures:**
- Is the report well-organized?
- Is the language clear and professional?
- Is it easy to navigate and understand?

**Connection to Diffusion:** Measures "generation gap" closing

---

## FACT Framework (Citation Quality)

FACT evaluates information retrieval and grounding capabilities:

### Evaluation Process

1. **Extract** statement-URL pairs from the report
2. **Deduplicate** redundant pairs
3. **Verify** via web scrape + LLM judgment
4. **Calculate** metrics

### Metrics

#### Citation Accuracy
- **Definition:** Percentage of citations correctly supported by their sources
- **Formula:** (Verified Citations / Total Citations) × 100

#### Effective Citations
- **Definition:** Average number of verified citations per task
- **Importance:** Measures both quantity and quality of sourcing

---

## Comparative Performance

### Google TTD-DR (Diffusion) vs Others

**Performance against OpenAI Deep Research:**
- **Win Rate:** 74.5%
- **Dataset 1:** +7.7% improvement
- **Dataset 2:** +1.7% improvement

### Why Diffusion Outperforms

| Factor | Explanation | Metric Impact |
|--------|-------------|---------------|
| Iterative refinement | Catches gaps through multiple passes | Higher Comprehensiveness |
| Parallel execution | Diverse perspectives gathered efficiently | Better Coverage |
| Explicit completion criteria | Based on findings, not appearance | Validated Comprehensiveness |
| Self-balancing | Adapts iterations to complexity | Right-sized research |
| Draft as context anchor | Persistent verified context | Higher Readability |
| Quality rules in final generation | Systematic application | Higher Insight |

---

## System Performance Characteristics

### Typical Metrics

| System | Report Time | Cost | Special Features |
|--------|-------------|------|------------------|
| GPT Researcher | ~3 min | ~$0.005 | 5-6 page reports |
| Perplexity DR | 2-4 min | Pro subscription | TTC architecture |
| OpenAI DR | 5-10 min | Pro/Plus subscription | Commercial grade |
| Diffusion (Go impl) | 5-15 min | ~$0.05-0.10 | Configurable iterations |

### Iteration Scaling

| Complexity | Typical Iterations | Sub-agents | Time |
|------------|-------------------|------------|------|
| Simple | 2-3 | 1-2 | 2-5 min |
| Moderate | 5-8 | 2-3 | 5-10 min |
| Complex | 10-15 | 3 | 10-15 min |

---

## Skywork DeepResearchAgent Benchmarks

### Overall Performance

| Metric | Score |
|--------|-------|
| Average Test Performance | 83.39 |
| Level 1 | 93.55 |
| Level 2 | 83.02 |
| Level 3 | 65.31 |

### Benchmark Comparison

Outperforms on:
- **SimpleQA** - Simple question answering
- **GAIA** - General AI Assistants
- **HLE** - High-Level Evaluation

---

## STORM Benchmarks (NAACL 2024)

### From Original Paper

**vs Outline-Driven Baselines:**
- **Organization:** +25% improvement
- **Coverage:** +10% improvement

**FActScore:** Comparable to human-written Wikipedia articles

### Strengths Measured

- Multi-perspective ensures diverse viewpoint coverage
- Conversation simulation generates high-quality questions
- Two-phase outline prevents incoherent structure

---

## Benchmark Considerations

### What Benchmarks Measure Well

- Report coherence and structure
- Citation accuracy and grounding
- Coverage of key topics
- Following explicit instructions

### What Benchmarks Miss

- Real-world user satisfaction
- Time-to-insight for practical use cases
- Handling of ambiguous or evolving queries
- Integration with existing workflows

### Evaluation Pitfalls

1. **Over-optimization:** Systems may optimize for benchmark patterns
2. **Domain bias:** Performance varies significantly by domain
3. **Static evaluation:** Real queries are often iterative
4. **Citation gaming:** More citations ≠ better research

---

## Practical Performance Testing

For the presentation demo, prepare these test scenarios:

### Simple Query (2-3 iterations expected)
```
What is the ReAct agent pattern?
```
Expected: Quick answer, 1-2 sources, ~2 min

### Moderate Query (5-8 iterations expected)
```
Compare STORM and Diffusion research architectures
```
Expected: Structured comparison, 5-10 sources, ~5 min

### Complex Query (10+ iterations expected)
```
What are the security implications of WebAssembly for sandboxed execution in cloud environments?
```
Expected: Deep analysis, 10+ sources, ~10 min

---

## Sources

- DeepResearch Bench: https://deepresearch-bench.github.io/
- Leaderboard: https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard
- STORM Paper: https://arxiv.org/abs/2402.14207
- Google TTD-DR Paper: https://arxiv.org/html/2507.16075v1
- Deep Research Survey: https://arxiv.org/abs/2508.12752
