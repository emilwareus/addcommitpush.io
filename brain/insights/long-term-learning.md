---
type: insight
title: "Long-Term Learning: Mechanisms, Evidence, and Failure Modes"
slug: long-term-learning
created: 2026-08-02
status: working
publish: true
tags:
  - learning science
related:
  - "[[spaced-repetition-scheduling-algorithms]]"
  - "[[knowledge-tracing]]"
---

# Long-Term Learning: Mechanisms, Evidence, and Failure Modes

A century of memory research converges on an uncomfortable conclusion: the study behaviors that
feel most productive — rereading, highlighting, massed practice, smooth error-free lessons — are
optimized for short-term performance and do almost nothing for long-term retention. The two
interventions with the strongest, most replicated evidence are retrieval practice (being forced to
recall from memory) and spaced practice (distributing that recall over time), and both feel worse
to the learner while they are happening. This dissociation between performance during learning and
durable learning is the single most important fact for anyone building an education system, human
or AI. It explains why learners systematically choose bad strategies, why classroom structures
resist the effective ones, and why an AI tutor's core loop must be built around a per-concept
memory model and a retrieval scheduler rather than around content delivery. This note explains the
underlying memory mechanisms, walks through the experimental evidence and how the field arrived at
it, corrects several numbers that are routinely misquoted (including Bloom's 2-sigma and the DKT
benchmark results), covers the algorithms that operationalize the science (SM-2, half-life
regression, FSRS, Bayesian and deep knowledge tracing), and catalogs the failure modes — what not
to build. Every quantitative claim below has been checked against the primary paper.

## Background: Learning Is Not Performance

The foundational distinction, formalized by Robert Bjork, is between **performance** (how well you
can do something right now) and **learning** (a durable change in what you can do later, in other
contexts). The two are not just different — they are experimentally dissociable: conditions that
raise performance during practice often lower long-term retention, conditions that suppress
practice performance often raise it, and learning can occur with no visible performance change at
all (Soderstrom & Bjork, 2015).

Bjork's "new theory of disuse" (Bjork & Bjork, 1992) gives the mechanism a two-variable model.
Every memory has:

- **Storage strength** — how well-entrenched the memory is. The theory assumes it is never lost;
  it only accumulates, and it grows most when the memory is retrieved while it is *hard* to
  retrieve.
- **Retrieval strength** — how accessible the memory is right now. It rises fast with recent
  exposure and decays with time and interference.

The critical interaction, stated directly in the theory: when an item with *low* retrieval
strength is successfully retrieved, it receives a *greater* increment in storage strength than an
item retrieved at high retrieval strength. Recalling something you were about to forget
strengthens it far more than recalling something you saw five minutes ago. This one asymmetry
generates most of the field's headline results: spacing works because the gap lets retrieval
strength decay before the next retrieval; massed practice fails because each repetition arrives
while retrieval strength is still high and therefore deposits almost nothing; and learners
misjudge their own learning because they can only feel retrieval strength (current fluency), not
storage strength (durability).

### The forgetting curve

Hermann Ebbinghaus (1885) produced the first quantitative description of forgetting. He memorized
lists of nonsense syllables (to eliminate prior-knowledge effects), waited, and then measured the
**savings** — how much less time relearning took compared to original learning. His data:

| Delay after learning | Savings on relearning |
| --- | --- |
| ~20 minutes | 58% |
| 1 hour | 44% |
| ~9 hours | 36% |
| 1 day | 34% |
| 2 days | 28% |
| 6 days | 25% |
| 31 days | 21% |

A direct modern replication (Murre & Dros, 2015) reproduced the shape of the curve closely from
20 minutes through 6 days using Ebbinghaus's own method, and additionally found a discontinuity —
a jump in savings around the 1-day point — consistent with sleep-related consolidation. Sleep is
not a footnote here: Mazza et al. (2016) had learners study foreign vocabulary in two sessions 12
hours apart and found that placing sleep *between* the sessions halved the practice needed to
relearn and produced better retention at both 1 week and 6 months. A scheduler that never spaces
across a night is leaving consolidation on the table.

Two properties of the curve matter. First, forgetting is steep initially and flattens — roughly
exponential in form, so it is well approximated by retention functions like `R(t) = exp(-t/S)`
where `S` is a stability parameter. Second, and less famous: **each relearning episode flattens
the curve**. Stability `S` grows with every successful spaced retrieval, so after a handful of
well-timed retrievals a memory becomes effectively permanent. Every spaced-repetition scheduler
from Leitner boxes to FSRS is a strategy for estimating `S` per item and scheduling the next
retrieval just before `R(t)` falls below an acceptable threshold.

## The Two Techniques That Survived a Century of Scrutiny

Dunlosky et al. (2013) evaluated ten popular learning techniques against the full evidence base,
grading each on whether benefits generalize across learners, materials, and retention intervals
(their Table 4). Only two earned the top rating, and the ranking is worth internalizing because
the bottom of the list is what students actually do:

| Technique | Utility rating | Why |
| --- | --- | --- |
| Practice testing (retrieval practice) | **High** | Robust across ages, materials, and delays; works with low-tech formats |
| Distributed (spaced) practice | **High** | Robust; benefit grows with retention interval |
| Elaborative interrogation (asking "why?") | Moderate | Works, but needs prior knowledge to elaborate from |
| Self-explanation | Moderate | Works when prompted (g ≈ 0.55, Bisra et al. 2018); costs time |
| Interleaved practice | Moderate | Strong in math/categories; direction reverses for some materials (see below) |
| Summarization | Low | Helps only with extensive training in how to summarize |
| Highlighting / underlining | Low | No measurable benefit; can hurt inference-making |
| Keyword mnemonics | Low | Narrow materials, poor durability |
| Imagery for text | Low | Narrow conditions |
| Rereading | Low | Large fluency gain, minimal retention gain |

### Retrieval practice: the testing effect

The modern anchor experiment is Roediger & Karpicke (2006, Experiment 2). Students learned prose
passages under three regimes — four study periods (SSSS), three study periods plus one free-recall
test (SSST), or one study period plus three free-recall tests (STTT) — with *no feedback* on any
test. The result inverts depending on when you measure:

| Final test delay | SSSS (study ×4) | SSST | STTT (test ×3) |
| --- | --- | --- | --- |
| 5 minutes | 83% | 78% | 71% |
| 1 week | 40% | 56% | 61% |

Massed studying wins the quiz you take today (d = 1.22 at 5 minutes); repeated retrieval wins the
exam you take next week (d = 1.26). Proportional forgetting over the week: 52% for the
repeated-study group, 14% for the repeated-testing group. Crucially, the students' own predictions
tracked the 5-minute result — mean judgments of one-week retention were 4.8 (SSSS) vs 4.0 (STTT)
on a 7-point scale; the most confident group retained the least. Retrieval is not measurement of
learning; the act of retrieval is itself a memory modifier, and a stronger one than re-exposure.

The effect is large and replicable at meta-analytic scale: Rowland (2014) found g = 0.50
(CI [0.42, 0.58]) across 61 studies / 159 effects; Adesope, Trevisan & Sundararajan (2017) found
g = 0.61 (CI [0.58, 0.65]) across 272 effects from 118 articles, with classroom settings at
g = 0.67. Karpicke & Blunt (2011, *Science*) showed retrieval practice beat elaborative concept
mapping (0.67 vs 0.45 on a one-week test, d = 1.50) — and the advantage held on inference
questions and even when the final test *was* concept mapping (d = 1.01), countering the intuition
that retrieval only drills rote facts. In that study 84% of students performed better after
retrieval practice while 75% predicted the opposite. Real classroom deployments need nothing
fancy: in 6th-grade social studies, low-stakes quizzing lifted chapter exams from 81% to 94% and
end-of-semester exams from 67% to 79% (Roediger, Agarwal, McDaniel & McDermott, 2011); in
8th-grade science, quizzing produced 13–25% gains on summative exams (McDaniel et al., 2011).
Closed-book "brain dumps" and mini-quizzes qualify (Agarwal & Bain, 2019).

Four boundary conditions matter for system design:

- **Feedback roughly doubles the effect.** Rowland's moderator analysis: g = 0.73 with feedback
  vs 0.39 without. Feedback corrects errors and turns failed retrievals into learning events —
  and *delayed* feedback outperformed immediate feedback in Butler & Roediger (2008): one-week
  cued recall of 0.56 (delayed) vs 0.45 (immediate) vs 0.31 (no feedback).
- **Format matters less than folklore says.** The "effortful formats beat recognition" intuition
  is not consistently supported: Rowland found cued recall (g = 0.61) above free recall and
  recognition (both g = 0.29) in the full dataset; Adesope found multiple-choice (0.70) *above*
  short-answer (0.48); Smith & Karpicke (2014) found no format difference across four
  experiments. Retrieval success plus feedback matters more than the response format.
- **Difficulty of successful retrieval is dose-dependent.** Pyc & Rawson (2009): the harder a
  *successful* retrieval was (longer intervals between practice trials), the better the final
  retention — while over-drilling to high within-session criteria showed diminishing returns.
  This is the retrieval-effort mechanism behind spacing, stated as a scheduling parameter.
- **Transfer is real but bounded.** Pan & Rickard's (2018) meta-analysis of transfer of
  test-enhanced learning: d = 0.40 overall, strongest to different test formats and
  application/inference questions, weakest to untested sibling material seen during study — and
  often *no* positive transfer when no favorable moderator is present. A tutor cannot assume that
  drilling one item strengthens its untested neighbors; coverage has to be explicit.

Two results turn retrieval practice into policy. Karpicke & Roediger (2008, *Science*) had
students learn Swahili–English pairs and then either kept testing items after the first correct
recall or dropped them. Learning curves were identical; one week later, the kept-in-testing
conditions sat at ~80% recall and the dropped conditions at 33–36% — d = 4.03, with
non-overlapping distributions, while repeated *studying* after the first correct recall added
nothing. Dropping an item from retrieval the moment it is "known" is the single most destructive
scheduling policy available. And Rawson & Dunlosky (2011; 533 students, 1–4-month retention)
turned the compound intervention — **successive relearning** — into a dosage prescription:
retrieve each item to an initial criterion of ~3 correct recalls, then relearn it to one correct
recall in ~3 widely spaced sessions; additional relearning sessions past three were "not time
well spent." That loop is exactly what a tutoring system should automate.

One more free lunch: the **pretesting effect**. Attempting to answer *before* studying — even
when the attempt is guaranteed to fail — improves subsequent learning. Richland, Kornell & Kao
(2009): pretest accuracy was 5%, yet pretested material was learned at 75% vs 56% for
extended-study controls (d = 1.1). Kornell, Hays & Bjork (2009) got the same result with
unanswerable fictional trivia (0.41 vs 0.31, d = 0.58) with answer-exposure time equated. A tutor
should pose the question before the explanation; wrong guesses are not wasted time.

### Spaced practice: the spacing effect and the ridgeline

Cepeda, Pashler, Vul, Wixted & Rohrer (2006) meta-analyzed 317 experiments (839 assessments from
184 articles): distributed practice reliably beats massed practice at every retention interval
tested, and — the key structural finding — the **optimal gap between study sessions grows with
how long you need to remember**. The follow-up (Cepeda et al., 2008), a 1,354-person study
crossing gaps of 0–105 days with retention intervals (RIs) of 7–350 days, mapped the "temporal
ridgeline." The observed optima for recall:

| Retention interval | Optimal gap (observed) | Gap as % of RI | Recall gain vs zero-gap |
| --- | --- | --- | --- |
| 7 days | 1 day | ~14% | +10% |
| 35 days | 11 days | ~31% | +59% |
| 70 days | 21 days | ~30% | +111% |
| 350 days | 21 days (model: 23) | ~6–7% | +77% |

Three design-relevant facts fall out of this surface:

- It is an **inverted U**: too-short gaps behave like massing (retrieval strength never decays,
  so little is deposited); too-long gaps mean the memory is gone before the second session.
  Overall, studying at the optimal gap rather than a zero-day gap improved final recall by 64%
  (d = 1.1) with total study time held constant.
- The **optimal gap grows with the retention interval, but as a shrinking fraction of it** — the
  paper's own summary: from about 20–40% of a 1-week test delay down to about 5–10% of a 1-year
  delay. For year-scale retention, the observed optimum was a roughly three-week gap.
- The penalty is **asymmetric**: "as gap increases, accuracy increases steeply and then declines
  much more gradually" — a too-long gap costs much less than a too-short one. A scheduler under
  uncertainty should err on the long side.

The practical rule: re-space after each successful retrieval, since each retrieval raises
stability and pushes the next optimal gap outward — expanding intervals over successive
retrievals. (Whether *expanding* schedules beat *equal-interval* schedules for a fixed number of
retrievals is genuinely unresolved: Karpicke & Roediger (2007) found expanding better at 10
minutes but equal spacing better at 2 days, and Cepeda et al.'s (2006) review of 18 such studies
calls the evidence tentative. The load-bearing variable is that gaps exist and are roughly
ridgeline-sized, not their precise shape.)

The effect holds in young children — Seabrook, Brown & Solity (2005) found distributed phonics
teaching (three 2-minute sessions/day) produced over six times the improvement of a single
6-minute session in 5-year-olds (8.3 vs 1.3 points) — and it survives contact with real
classrooms at system scale: Lindsey, Shroyer, Pashler & Mozer (2014) deployed a personalized
spaced-review scheduler (a per-student, per-item memory model) in a semester-long middle-school
Spanish course and improved cumulative-exam retention by 16.5% over massed review and 10.0% over
one-size-fits-all spacing. That study is the existence proof for the central engineering claim of
this note: modeling individual forgetting and scheduling against it beats both no spacing and
generic spacing, in a real course, on a delayed exam.

## Desirable Difficulties and the Metacognitive Illusion

Bjork (1994) named the umbrella principle **desirable difficulties**: manipulations that slow or
impair acquisition while enhancing long-term retention and transfer. The canonical family:
spacing, interleaving (contextual interference), varying practice conditions, reducing feedback
frequency, and using tests rather than presentations as learning events — with generation
(producing answers rather than reading them; Slamecka & Graf, 1978) added in later formulations.

### Interleaving

Mixing problem types instead of blocking them is the sharpest demonstration that practice
performance and learning move in opposite directions:

| Study | During practice | Delayed test | Effect |
| --- | --- | --- | --- |
| Rohrer & Taylor (2007), college math | blocked 89% vs interleaved 60% | interleaved 63% vs blocked 20% (1 week) | d = 1.34 |
| Rohrer, Dedrick & Stershic (2015), 7th-grade math | practice compliance ≈ equal | 80% vs 64% (1 day); 74% vs 42% (30 days) | d = 0.42 / 0.79 |
| Rohrer, Dedrick, Hartwig & Cheung (2020), preregistered RCT, 54 classrooms, 787 students | — | 61% vs 38% (~1 month) | d = 0.83, positive for all 15 teachers |

Note the 2015 pattern: interleaved practice was "near immunity against forgetting" — a 30-fold
increase in test delay cost 6 points (80→74) for interleavers and 22 points (64→42) for blockers.
The interleaving advantage is substantially a *forgetting-resistance* advantage, which is why
short-delay tests understate it.

The mechanism is **discriminative contrast**, not spacing in disguise: interleaving forces the
learner to *select* a strategy on every problem (the skill exams and life actually demand),
whereas blocking lets them re-execute a known procedure. Two results pin this down. Birnbaum,
Kornell, Bjork & Bjork (2013): inserting 10-second gaps between category exemplars — adding
spacing while destroying juxtaposition — *eliminated* the interleaving benefit. Kang & Pashler
(2012): interleaving beat a blocked-but-equally-spaced control (68% vs 61%, d = 0.78) with
temporal spacing equated.

But interleaving is the most boundary-conditioned of the desirable difficulties, and an honest
summary needs the moderator map. Brunmair & Richter's (2019) meta-analysis (59 studies, 238
effects) found overall g = 0.42, decomposing to:

| Material | Interleaving effect |
| --- | --- |
| Paintings / visual categories | g = 0.67 |
| Mathematical tasks | g = 0.34 |
| Expository texts, tastes | ≈ 0 (not significant) |
| Word / vocabulary learning | **g = −0.39 (blocking wins)** |

Interleaving helps when categories are mutually confusable (high between-category similarity) and
hurts when items are unrelated — consistent with Carvalho & Goldstone (2014), who showed the
advantage flips to blocking for low-similarity categories. Rohrer's own papers add the practical
caveats: keep a small initial block when a skill is first introduced, expect interleaved
assignments to take more time, and provide corrective feedback, since interleaved practice
produces more errors.

### The metacognitive illusion

The dark side of every desirable difficulty is that learners judge learning by **fluency** — how
easily material is processed right now — which is a readout of retrieval strength, not storage
strength. The cleanest demonstration is Kornell & Bjork (2008): learning painters' styles from
exemplars, spacing/interleaving beat massing decisively (d ≈ 1.0–1.3), yet — judging *after*
taking the final test — 78% of participants performed better with spacing while 78% rated massing
as good or better. The illusion survives direct experience of the outcome. Students also misuse
the one effective technique they do adopt: 91% of surveyed undergraduates self-test, but only 18%
treat testing as a learning event rather than a knowledge check (Kornell & Bjork, 2007).

This has a hard product consequence: **a system that optimizes for learner-perceived progress or
in-session success will be selected *against* the interventions that work.** Any effective system
must either make the difficulty legible ("this is supposed to feel hard; here is why") or absorb
the strategy choice into the system so the learner never has to choose against their intuition.

## Reading the Effect-Size Evidence Without Fooling Yourself

Education research communicates in Cohen's d (difference in means divided by pooled standard
deviation). Hattie's synthesis puts the average of all studied educational interventions around
d = 0.40, a useful "hinge": an intervention at d = 0.40 is merely average, not good. Here is the
hierarchy relevant to tutoring, with the trust caveats that summaries usually omit:

| Intervention | Reported effect | Source | How much to trust it |
| --- | --- | --- | --- |
| One-on-one tutoring + mastery learning | d = 2.0 | Bloom (1984) | Upper bound from two ideal-condition dissertations — see below |
| Human tutoring (controlled studies) | d = 0.79 | VanLehn (2011) | Well-controlled; drops to 0.68 excluding Bloom's own Anania study |
| Step-based intelligent tutoring systems | d = 0.76 | VanLehn (2011) | Statistically indistinguishable from human tutoring in the same review |
| ITS (strict-criteria meta-analysis) | median d = 0.66 | Kulik & Fletcher (2016) | 50 evaluations; much larger on locally developed than standardized tests |
| Formative evaluation | d = 0.90 → 0.48 | Hattie (2009 → 2017 update) | Direction solid; the magnitude halved between editions — treat as tier, not number |
| Feedback | d = 0.73 (Hattie 2009); 0.48 (Wisniewski et al. 2020, 435 studies) | — | Highest-variance intervention here: 38% of effects in Kluger & DeNisi (1996) were *negative* |
| Metacognitive strategy instruction | d ≈ 0.60–0.69 | Hattie (2009/2017) | Consistent across reviews |
| Retrieval practice | g = 0.50–0.61 | Rowland (2014); Adesope et al. (2017) | Among the most robust effects in the field; g = 0.67 in classrooms |
| Mastery learning | d = 0.52 | Kulik, Kulik & Bangert-Drowns (1990) | Real, but see the test-alignment caveat below |
| Spaced practice | up to +111% recall vs massed | Cepeda et al. (2008) | Extremely robust; benefit grows with retention interval |
| Direct instruction (for novices) | d ≈ 0.59 | Hattie (2009); Kirschner et al. (2006) | Solid for novices; reverses with expertise |
| ITS meta (broader inclusion) | g ≈ 0.41–0.43 | Ma et al. (2014) | 107 findings; ITS ≈ human small-group instruction in this analysis |
| Tutoring programs at scale (RCTs) | d = 0.37 | Nickow, Oreopoulos & Quan (2020) | 96 randomized trials — the honest field estimate; EEF toolkit: ≈ +5 months |
| Cognitive Tutor Algebra at scale | ≈ +0.20 (year 2 only) | Pane et al. (2014) | ~147 schools; year 1 null — implementation maturity matters |
| Inquiry/problem-based learning | d ≈ 0.15–0.40 | Hattie (2009/2017) | Works mainly when foundations already exist |
| Matching teaching to "learning styles" | ~0 | Pashler et al. (2008) | No credible supporting evidence despite decades of belief |
| Grade retention (holding students back) | d = −0.16 (2009) / −0.32 (2017 list) | Hattie | Harmful in both editions |

Read the ITS rows top to bottom and a pattern appears that generalizes across this whole
literature: **effects shrink as studies move from lab to field, from experimenter-made tests to
standardized tests, and from small deployments to scale** (0.76 → 0.66 → 0.42 → 0.37 → 0.20).
None of these numbers is "the" effect of tutoring software; the funnel itself is the finding.

Three corrections to the folklore version of this table:

**Bloom's 2-sigma is a ceiling for a bundle, not a fact about tutoring.** Bloom (1984) reported
that tutored students scored two standard deviations above conventional 30:1 classroom
instruction — the average tutored student above 98% of the control class. But the underlying data
are two dissertations from his own group (Anania; Burke): grades 4–8, single well-defined units
(probability, cartography), three weeks of instruction — and the tutoring condition *included*
mastery learning's formative-test-and-correctives loop; Bloom's own Figure 2 labels the 2.0σ bar
"tutoring + mastery learning," and neither dissertation evaluated tutoring alone. Mastery
learning by itself was ~1σ in the same studies, so tutoring's increment over mastery procedures
was roughly 0.8σ (Kulik & Fletcher, 2016). Modern evidence puts replicated human tutoring far
lower: VanLehn (2011) found d = 0.79 across controlled studies, and Nickow et al.'s meta-analysis
of 96 randomized K-12 tutoring trials found a pooled d = 0.37 (strongest for teacher and
paraprofessional tutors and in early grades). The right reading: 2.0 is what individualization +
mastery + immediate feedback achieved under ideal conditions on aligned tests — the headroom
target, not a benchmark any deployed system has hit.

**VanLehn's granularity result is a plateau, not a ladder.** The interaction granularity
hypothesis predicted finer-grained feedback → more learning, all the way down. The data said
otherwise: moving from answer-based CAI (d ≈ 0.30, the Kulik & Kulik 1991 benchmark VanLehn used)
to step-based tutoring (d = 0.76) is a huge win, but *substep*-based tutoring came in at d = 0.40
— nominally worse, and certainly no better. Step-based ITS matched human tutors (0.76 vs 0.79).
The design implication is precise: give feedback and hints at the level of *solution steps* — not
only at final answers, and not micro-managing below the step. Beyond that granularity, invest
elsewhere.

**Hattie's rankings are directional, not precise.** Visible Learning aggregates 800+
meta-analyses covering wildly different outcome measures, populations, and designs. The numbers
move between editions (formative evaluation went from 0.90 to 0.48; grade retention from −0.16 to
−0.32), and methodologists have documented outright calculation errors — Bergeron & Rivard (2017)
show Hattie's "common language effect" values, supposedly probabilities, range from −49% to 219%.
Use the hierarchy to sort interventions into tiers — clearly strong / average / harmful — and
never to claim "X is exactly d = 0.73."

Feedback deserves its own warning label, since it is both powerful and dangerous. Kluger &
DeNisi's (1996) classic meta-analysis (607 effect sizes): average d = 0.41, but 38% of feedback
interventions *reduced* performance. Hattie & Timperley (2007) explain the variance with four
feedback levels: task, process, self-regulation, and self. Process- and self-regulation-level
feedback ("your error pattern suggests you're forgetting to check the sign when distributing")
drives learning; self-level feedback (praise — "you're so smart!") is rarely effective and can
backfire. Wisniewski, Zierer & Hattie (2020, 435 studies) confirm: high-information feedback
works best, reinforcement/punishment worst. This is the strongest argument for treating feedback
generation as a designed, evaluated component rather than a place where an LLM freestyles.

**What about LLM tutors specifically?** The first credible RCTs (2023–2026) split cleanly along
this note's central axis. Kestin et al. (2025): a carefully scaffolded GPT-4 physics tutor at
Harvard beat in-class active learning with effect sizes of 0.73–1.3 SD — on *immediate*
post-tests. A World Bank RCT in Nigeria (800 students, six weeks of after-school GPT-4-assisted
English) found +0.23 SD on English outcomes at unusually low cost. But Bastani et al. (2025, high
school math): *unrestricted* GPT-4 access improved practice performance by 48% and then *reduced*
unaided exam performance by 17% — students used the model as an answer engine and learned less
than the no-AI control — while a version with tutor-style guardrails (hints, no direct answers)
eliminated the harm. And no LLM-tutor RCT to date reports *delayed* retention outcomes, which by
the performance/learning dissociation means even the positive results are so far performance-side
evidence. The technology amplifies whichever loop you build: scaffolded retrieval-and-hints, or
frictionless answer extraction.

## Mastery Learning: The Mechanism and Why Classrooms Dropped It

Bloom's Learning for Mastery (1968), building on Carroll's (1963) model of school learning,
inverts the classroom constant: conventional instruction holds *time* constant and lets
*achievement* vary; mastery learning holds *achievement* constant and lets *time* vary — aptitude
is re-conceived as the *rate* at which a student learns, not a ceiling on what they can learn.
The loop: teach a unit → formative assessment → students below the mastery threshold get
corrective instruction (a *different* explanation, not just more of the same) → students above it
get enrichment → parallel reassessment → progress once mastery is demonstrated. The theoretical
justification is cumulative: most curricula are prerequisite chains, so a student who "passes" a
unit at 70% carries a 30% hole into every subsequent unit that builds on it, and gaps compound
into what looks like inability but is actually accumulated prerequisite debt.

The evidence: Kulik, Kulik & Bangert-Drowns (1990), across 108 studies (103 with end-of-
instruction exams), found d = 0.52 overall, rising to 0.64 where the mastery threshold was strict
(91–100%), with retention follow-ups averaging d = 0.71 at ~8 weeks. Honest caveats, because
mastery learning is also the clearest case study in evaluation hygiene: effects on
*experimenter-made* tests averaged 0.57 while effects on *standardized* tests averaged 0.29 — and
for Bloom-style LFM programs specifically, the five studies with standardized tests found
essentially nothing (≈ 0.10). Slavin's (1987) best-evidence synthesis, restricted to studies with
standardized measures and equal time, found a median near 0.25 and argued the robust effects are
test-alignment artifacts. Time cost is disputed the same way: Kulik et al. measured ~4% extra
time in typical implementations, while Guskey's practitioner literature estimates correctives add
10–20% to initial units. The defensible claim: mastery learning reliably improves performance on
the material actually taught and assessed, with the size of the "true" gain depending on how far
the outcome measure sits from the taught unit — which is precisely Pan & Rickard's transfer
boundary appearing at curriculum scale.

Why did classrooms drop it? Bloom's group-based LFM keeps the class together, which means
early-masters wait while correctives run — and the individualized variants (Keller's PSI) that
let students move at their own pace collapse under the bookkeeping: managing thirty students at
different curriculum positions, authoring parallel assessment forms and multiple corrective
explanations per unit, and fighting the grading system (Guskey, 2010, describes the machinery and
its costs; the decline itself is documented across the implementation literature). This is the
important asymmetry for AI tutoring: **every reason mastery learning failed in classrooms is a
bookkeeping problem, and bookkeeping is what software is good at.** Per-student pacing, unlimited
parallel assessment variants, and alternate explanations on demand are exactly the parts an
LLM-based system makes cheap.

Two design rules follow. First, mastery must mean more than a percentage: a student can hit 80%
via guessing, pattern-matching, or memorized procedures ("fragile knowledge"); demonstrated
mastery should include explanation or transfer, and low-confidence correct answers should trigger
an "explain your reasoning" probe (prompted self-explanation independently carries g ≈ 0.55 —
Bisra et al., 2018). Second, remediation must traverse the prerequisite graph backward — if a
student fails fraction addition, the fix is often a decayed prerequisite (equivalent fractions),
not more fraction-addition drills.

## The Machinery: Student Modeling and Retrieval Scheduling

Everything above becomes implementable through two components: a model of what the student knows
(knowledge tracing) and a policy for when to bring each item back (scheduling).

### Bayesian Knowledge Tracing (BKT)

Corbett & Anderson (1994) is still the reference student model. Each skill is a two-state hidden
Markov model — known or not known — observed through noisy correct/incorrect responses. Four
parameters per skill:

- `P_L0` — probability the skill is known before practice starts
- `P_T` — probability of transitioning to known after a practice opportunity
- `P_guess` — probability of answering correctly while not knowing
- `P_slip` — probability of answering incorrectly while knowing

```
# state per (student, skill): L = current belief that skill is known
L = P_L0

on each attempt with observed response:
    # 1. Bayesian update on the evidence
    if correct:
        posterior = L*(1 - P_slip) / (L*(1 - P_slip) + (1 - L)*P_guess)
    else:
        posterior = L*P_slip / (L*P_slip + (1 - L)*(1 - P_guess))

    # 2. Learning transition (student may have just learned it)
    L = posterior + (1 - posterior) * P_T

    # prediction for the next attempt:
    P(correct next) = L*(1 - P_slip) + (1 - L)*P_guess

mastery declared when L >= 0.95   # the Cognitive Tutor's criterion
```

(The 1994 paper states the update as Bayesian inference plus the transition equation; the
explicit posterior formulas above are the standard derivation, made explicit in later
presentations.) Parameters are fit per skill from historical data (expectation-maximization or
grid search). BKT's virtues: interpretable, works with sparse data, and its mastery estimate
directly drives pedagogy. Its known problems: skills are assumed independent (false — that is
what prerequisite graphs are for); **no forgetting** — `L` never decreases, so vanilla BKT
literally cannot represent the forgetting curve and must be extended with a decay term for any
long-term system; and the identifiability problem (Beck & Chang, 2007) — an infinite family of
parameter sets makes identical performance predictions while implying different knowledge states,
which is why practitioners bound the parameters (the common "bounded BKT" convention,
P_guess ≤ 0.3 and P_slip ≤ 0.1, comes from this later degeneracy work — Baker, Corbett & Aleven
2008 lineage — not from the original paper). Baker et al. (2008) also improved accuracy by making
slip/guess contextual, using response time and help requests as evidence.

### The logistic family: IRT, PFA, and Elo

The other classical lineage models P(correct) directly as a logistic function rather than
tracking a hidden knowledge state. **Item Response Theory** (Rasch, 1960; Lord, 1980) is the
psychometric backbone: `P(correct) = σ(θ_student − b_item)`, one ability parameter per student,
one difficulty per item — the model behind adaptive testing. **Performance Factors Analysis**
(Pavlik, Cen & Koedinger, 2009) extends it with per-skill counts of prior successes and failures,
giving an interpretable, incrementally updatable student model with no EM fitting. **Elo-family
ratings** (Klinkenberg et al., 2011 — the Math Garden system; Pelánek, 2016) are the production
workhorse: student ability and item difficulty updated online after every response, exactly like
chess ratings, which is the cheapest way to run the difficulty-targeting controller described
under ZPD below. These matter because they are the actual baselines that modern deep models get
compared against — and, as it turned out, largely tie.

### Deep Knowledge Tracing and the hype correction

Piech et al. (2015) replaced the per-skill HMM with a single LSTM over the student's full
interaction sequence, reporting AUC 0.86 on ASSISTments vs 0.67–0.69 for BKT — "a 25% gain over
the previous best" — and launched a subfield. The correction arrived within a year and is a case
study in benchmark hygiene. Xiong et al. (2016) found the benchmark dataset contained 23.6%
duplicated rows plus scaffolding items the baselines had excluded; on cleaned data, DKT scored
0.73–0.75 — statistically tied with plain logistic PFA at 0.73. Khajah, Lindsey & Mozer (2016)
showed classical models given the same affordances close the rest of the gap: BKT with a
forgetting term reached 0.83 vs DKT's 0.86, and BKT variants with exercise-indexed difficulty
beat DKT outright (0.90); their verdict was "indistinguishable on average." Wilson et al. (2016)
found hierarchical IRT matched or beat DKT on every dataset. Gervet et al. (2020), across nine
datasets: well-featured logistic regression leads on moderate-size data, deep models lead on the
largest datasets or where fine temporal structure matters, and BKT-family models lag both. Later
architectures — DKVMN's key-value memories (Zhang et al., 2017), attention-based SAKT (Pandey &
Karypis, 2019) and AKT (Ghosh et al., 2020) — improved benchmarks further, but a decade in,
essentially no production tutor runs deep knowledge tracing. The reasons are structural, not
fashion: deep models are cold-start hungry, and — decisive for tutoring — they predict *response
correctness* without exposing *which skill is deficient and why*, so they cannot justify
pedagogical decisions to students or teachers. The pragmatic architecture: interpretable
per-skill state (BKT-with-forgetting or the logistic family) as the system of record, optionally
sharpened by a sequence model, with the emerging frontier being LLM-based assessment of
open-ended student explanations feeding evidence into that structured state.

### Scheduling: from Leitner boxes to FSRS

Scheduling algorithms operationalize the ridgeline: estimate each item's memory stability and
schedule retrieval just before predicted recall drops below a target (typically 90%).

- **Leitner (1972):** items move through boxes with increasing review intervals; failure demotes
  the item to box one. A step-function approximation of expanding intervals — trivially simple,
  surprisingly effective.
- **SM-2 (Wozniak, 1987; the basis of classic Anki):** per-item easiness factor and
  multiplicative interval growth:

```
# state per item: n (consecutive successes), EF (easiness, init 2.5), I (interval, days)
# input after each review: quality q in 0..5

if q < 3:                    # failed recall
    n = 0
    I = 1                    # relearn from short interval; EF unchanged
else:
    n += 1
    if n == 1:   I = 1
    elif n == 2: I = 6
    else:        I = round(I * EF)
    EF = max(1.3, EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

schedule next review at today + I
# (original SM-2 also re-drills any item scoring < 4 later the same day until it reaches >= 4)
```

  Note what SM-2 encodes: intervals *expand* after success (stability grew), failure *resets*
  toward short intervals, and per-item difficulty modulates growth. Its weakness is that the
  update rules are hand-tuned constants, not fit to data.
- **Half-Life Regression (Settles & Meeder, 2016 — Duolingo):** model recall as
  `p = 2^(-Δ/h)` where `Δ` is time since last practice and half-life `h = 2^(θ·x)` is regressed
  from features (correct/incorrect counts, item difficulty) over 12.9M review traces. Cut recall-
  prediction error by ~45% vs a tuned Leitner baseline (MAE 0.128 vs 0.235). The step from
  hand-tuned rules to a learned forgetting model.
- **Optimal-control formulations:** Tabibian et al. (2019, *PNAS*) framed spaced repetition as
  stochastic optimal control and derived MEMORIZE, a provably optimal policy in which review
  intensity is proportional to the item's current forgetting rate — the theoretical bridge
  between regression models and deployed schedulers, validated on Duolingo data.
- **FSRS (derived from Ye, Su & Cao, KDD 2022; Anki's modern scheduler since 23.10):** implements
  the three-component model directly — per-item **D**ifficulty, **S**tability, and
  **R**etrievability, with a power-law forgetting curve (FSRS v4: `R(t) = (1 + t/(9S))^(-1)`;
  later versions generalize the exponent) — and fits its 17–21 parameters to the individual
  learner's review history. On the open srs-benchmark (~10,000 Anki users, ~727M reviews), FSRS
  predicts recall better than SM-2 for 99.6% of users, which translates to fewer reviews for the
  same retention. This is the current practical state of the art for the scheduling half of the
  problem — and Lindsey et al. (2014) is the classroom RCT showing this model class pays off on
  real course outcomes.

A tutor-scale scheduler adds constraints flashcard apps ignore: retrieval events should be
**interleaved across confusable topics** (a free desirable difficulty — subject to the Brunmair &
Richter similarity boundary), **varied in format with feedback attached** (format itself matters
less than feedback presence), **never dropped at first success** (Karpicke & Roediger 2008:
d = 4.03 for staying in the queue; Rawson & Dunlosky's 3-recalls-then-3-relearnings rule is the
dosage), **biased long under uncertainty** (the ridgeline's asymmetric penalty), and
**prioritized by prerequisite centrality** — letting a load-bearing concept decay costs more than
letting a leaf concept decay.

### Targeting difficulty: the Zone of Proximal Development, operationalized

Vygotsky's ZPD (1978) — the band between what a learner can do alone and what they can do with
help — is the difficulty-targeting principle. Murray & Arroyo (2002) operationalized it for
tutoring systems as a target band of help-usage: adapt task difficulty so the student needs some,
but bounded, assistance. Concretely: (1) **dynamic assessment** — pose a problem at the edge of
estimated ability; if the student fails, give a graded hint and observe whether it unlocks the
solution (success-with-one-hint ≈ inside the ZPD; failure-despite-hints ≈ beyond it);
(2) **success-rate control** — regulate difficulty to hold success around 80–90% (an Elo-style
online rating makes this a one-line controller), high enough to build self-efficacy, low enough
that retrieval stays effortful; (3) **scaffold fading** — support must be withdrawn as competence
grows, or the support becomes a dependency. A workable hint ladder (a synthesis, not a validated
protocol): first error → targeted hint at the failing step; second → conceptual hint; third →
worked example; fourth → drop back to the prerequisite concept. The key insight: the ZPD is not a
property of the student but of the student-task pair — it must be re-estimated per skill, not
assumed global. LLMs are genuinely strong here: generating hints at graduated specificity,
tailored to the student's actual error, was hand-authored content in classic ITS and is now cheap.

## Sequencing Instruction: Cognitive Load and the Guidance Continuum

Cognitive Load Theory (Sweller, 1988) supplies the constraint that shapes *how* to teach at each
expertise level. Working memory holds roughly four chunks (3–5; Cowan, 2001) for seconds without
rehearsal; long-term memory is effectively unlimited; learning is the construction of schemas in
long-term memory that let bigger chunks pass through the working-memory bottleneck. Load splits
into **intrinsic** (inherent element interactivity of the material), **extraneous** (imposed by
bad presentation — the part instruction can eliminate), and **germane** (the productive effort of
schema construction). The replicated effects and their design translations:

| Effect | Finding | Design rule |
| --- | --- | --- |
| Worked example (Sweller & Cooper, 1985) | Novices studying solutions learned in a fraction of the time (conventional problem-solvers took ~6× longer through the learning phase) and made ~1/5 the errors on similar test problems — but the advantage did not extend to dissimilar problems | Start new concepts with worked examples; do not expect them to buy transfer by themselves |
| Expertise reversal (Kalyuga et al., 2003) | Worked examples lose their benefit and become *detrimental* for advanced learners | Instructional format must adapt to the knowledge state |
| Guidance fading (Renkl & Atkinson, 2003) + completion effect (van Merriënboer) | Example → partially-completed problem → full problem is the optimal ramp | Fade support gradually, per concept |
| Split attention | Separated text + diagram forces costly integration | Physically integrate explanations into diagrams |
| Redundancy | Duplicated simultaneous information adds load | Do not narrate on-screen text verbatim |
| Modality | Audio + visual channels extend effective capacity | Narrate diagrams instead of captioning them |

The same logic frames the direct-instruction-versus-discovery debate. Kirschner, Sweller & Clark
(2006) argue from the working-memory bottleneck that minimally-guided instruction fails novices:
searching a problem space consumes the entire working-memory budget, leaving nothing for schema
construction. The evidence supports them — *for unguided discovery with novices*. The expertise
reversal effect supplies the other half: as schemas form, guidance becomes redundant and
problem-solving becomes the better use of time. And there is a designed exception in between:
**productive failure** (Sinha & Kapur, 2021; meta-analysis of 166 comparisons) — a structured
problem-solving attempt on contrasting cases *before* instruction — beat instruction-first on
conceptual knowledge and transfer (g = 0.36, up to ≈ 0.58 for high-fidelity designs) without
hurting procedural knowledge, though the effect *reverses* for young learners (grades 2–5). Note
that this is the pretesting effect scaled up to whole lessons: a failed generation attempt
prepares the mind for the explanation that follows. So "direct instruction vs. inquiry" is a
false dichotomy; the real variables are **where the learner sits on the novice-expert continuum
for this specific concept** and **whether the struggle is designed and bounded**. The correct
policy is a per-concept slide from full guidance (direct instruction, worked examples) through
completion problems to independent, interleaved practice — optionally prefixed, for older
students, by a short bounded problem-solving attempt. Chi & Wylie's (2014) ICAP framework gives
the activity-selection heuristic within any of these stages: learning outcomes ordered
Interactive > Constructive > Active > Passive — prefer formats where the student generates or
co-constructs over formats where they select or receive.

## Motivation: The Part That Determines Whether Any of This Runs

The cognitive interventions only work if the student keeps showing up, and spaced retrieval — the
most effective intervention — is also the least pleasant. Motivation science is what closes that
gap, and its headline results are mostly warnings.

**Self-Determination Theory** (Deci & Ryan) identifies three needs that sustain intrinsic
motivation: **autonomy** (acting volitionally — controlling language and surveillance measurably
reduce engagement, depth of processing, and persistence; Vansteenkiste et al., 2004),
**competence** (the experience of mastering optimal challenges — which the 80–90% success-rate
policy delivers directly), and **relatedness** (feeling connected — the channel through which
tutor persona and long-term relationship plausibly matter).

**The gamification trap.** Deci, Koestner & Ryan's (1999) meta-analysis of 128 experiments:
expected tangible rewards *undermine* intrinsic motivation for interesting tasks
(engagement-contingent d = −0.40; the overjustification effect — Lepper et al., 1973, found
children promised an award for drawing subsequently drew about half as much in free play), while
unexpected rewards and verbal encouragement do not undermine. Points, badges, and leaderboards
import exactly the risky category: they buy short-term engagement metrics and can crowd out
interest in the learning itself — and engagement metrics are fluency-side measures, so by the
performance/learning dissociation they are not evidence of durable learning in the first place.
If game mechanics are used at all, they should reward *learning behaviors* (completing a hard
retrieval streak) rather than *performance outcomes*, and celebration should be informational
("you retained 90% of last month's concepts") rather than controlling.

**Interest develops in phases.** Hidi & Renninger (2006): triggered situational interest (a hook
— novelty, story, surprise) → maintained situational interest (sustained by meaning and personal
relevance) → emerging individual interest (the student starts returning voluntarily) →
well-developed individual interest (self-sustaining curiosity that survives difficulty). External
triggers only start the process; the transition to individual interest requires connecting
material to the learner's own projects and identity over long periods. This is the strongest
research argument for tutors that persist across years rather than sessions.

**Self-efficacy** (Bandura, 1977) — task-specific belief in one's capability — predicts
persistence and accounts for ~14% of variance in academic performance (r = .38; Multon, Brown &
Lent, 1991). Its dominant source is *mastery experiences*, i.e., genuinely succeeding at
genuinely hard things — which the success-rate controller manufactures. Cheap praise is not a
substitute (see the feedback levels above).

**Mindset and grit, with replication honesty.** Dweck's growth-mindset interventions replicate at
much smaller magnitudes than the popular narrative: Sisk et al. (2018) found the
mindset-achievement correlation is r = .10 and intervention effects average d = 0.08 (d = 0.19
for academically at-risk students, d = 0.34 for low-SES); the rigorous national study (Yeager et
al., 2019) found ~0.10 GPA points, concentrated in lower-achieving students and strongest where
peer norms supported challenge-seeking. Grit (Duckworth et al., 2007) is largely
conscientiousness re-measured (Credé et al., 2017: meta-analytic grit-conscientiousness
correlation ρ = .84; grit-academic-performance ρ = .18). The defensible takeaway is narrow:
*feedback framing matters* — attribute struggle to strategy and process, treat errors as
information, never signal that ability is fixed — but do not expect mindset messaging to
substitute for the cognitive interventions.

## What Not to Do

The negative results are as load-bearing as the positive ones. Each row is a documented failure
mode, not a style preference:

| Anti-pattern | Why it fails | Evidence |
| --- | --- | --- |
| Optimizing in-session performance | Performance and learning dissociate; smooth sessions can mean nothing was encoded durably | Soderstrom & Bjork (2015) |
| Dropping an item from retrieval once it's "known" | One-week retention collapses from ~80% to ~35% | Karpicke & Roediger (2008), d = 4.03 |
| Rereading / highlighting as study | Fluency without retention | Dunlosky et al. (2013) |
| Blocked practice units, "finish topic, move on" | Massing + no reactivation → forgetting curve runs to completion | Cepeda et al. (2006, 2008); Rohrer & Taylor (2007) |
| Interleaving everything indiscriminately | Benefit requires confusable categories; reverses for unrelated material (words: g = −0.39) | Brunmair & Richter (2019); Carvalho & Goldstone (2014) |
| Assuming drilled items strengthen untested neighbors | Transfer of testing is bounded; often zero without favorable conditions | Pan & Rickard (2018) |
| Matching instruction to "learning styles" | No credible evidence for the meshing hypothesis despite direct tests | Pashler et al. (2008) |
| Unguided discovery learning for novices | Problem-space search saturates working memory before schemas exist (designed, bounded struggle is the exception) | Kirschner, Sweller & Clark (2006); cf. Sinha & Kapur (2021) |
| Worked examples for experts | Expertise reversal — redundant guidance adds load | Kalyuga et al. (2003) |
| Points/badges/leaderboards on interesting tasks | Overjustification; expected tangible rewards crowd out intrinsic interest | Deci et al. (1999); Lepper et al. (1973) |
| Engagement metrics as learning proxy | Time-on-platform and completion are fluency-side measures; they do not certify retention | Follows from Soderstrom & Bjork (2015); only delayed retrieval measures learning |
| Praise-the-person feedback | Self-level feedback is the weakest level; 38% of feedback effects were negative | Hattie & Timperley (2007); Kluger & DeNisi (1996) |
| "80% and advance" without scheduled review | Prerequisite debt compounds; mastery decays without retrieval | Bloom (1968); Kulik et al. (1990) + forgetting curve |
| Trusting mastery from correctness alone | Guessing, gaming, and fragile knowledge all pass thresholds | Baker et al. (2004) on gaming the system |
| Always-available unlimited help | Help abuse replaces retrieval effort; unrestricted GPT-4 access raised practice scores 48% and cut exam scores 17% | Aleven & Koedinger (2000); Baker et al. (2004); Bastani et al. (2025) |
| Session-scoped student models | Forgetting operates on weeks-to-months; a model that resets cannot schedule retrieval | Direct consequence of Cepeda et al. |
| Black-box student models driving pedagogy | Unexplainable mastery estimates cannot justify decisions; the DKT benchmark gains were largely artifacts | Xiong et al. (2016); Khajah et al. (2016); Gervet et al. (2020) |
| Evaluating on aligned/immediate tests only | Effects shrink on standardized measures and at scale; immediate post-tests measure performance, not learning | Slavin (1987); Kulik & Fletcher (2016); Pane et al. (2014) |
| Quoting Bloom's d = 2.0 as achievable baseline | Ceiling from two ideal-condition studies of tutoring *plus* mastery learning; replicated tutoring is 0.37–0.79 | Bloom (1984); VanLehn (2011); Nickow et al. (2020) |

Two of these deserve emphasis because they are the ones AI tutors are currently getting wrong.
**Help abuse / gaming the system:** Baker, Corbett, Koedinger & Wagner (2004) documented students
systematically exploiting hint mechanics to extract answers without thinking; gaming frequency
correlated with post-test scores as strongly as prior knowledge did, and no other off-task
behavior came close (the help-abuse link goes back to Aleven & Koedinger, 2000). An LLM tutor
with a friendly chat interface is a dramatically better answer-extraction machine than 2004-era
hint buttons — and Bastani et al. (2025) is the controlled demonstration that this failure mode
is live: same model, same students, and the guardrailed variant helped while the unrestricted
variant actively hurt exam performance. Hint ladders need rate structure, and the system needs to
detect answer-fishing patterns. **Short-horizon optimization:** almost every engagement-driven
product objective (session completion, streaks, time-on-task, satisfaction ratings) is a
fluency-side metric, and fluency-side metrics select against desirable difficulties. The only
honest objective is delayed retention — measured by the system's own spaced retrievals.

## Design Implications: The Core Loop of a Durable-Learning Tutor

Assembling the evidence into an architecture, the load-bearing components are a persistent
per-student knowledge state, a retrieval scheduler, and a pedagogy selector — with the LLM as the
interaction layer, not the system of record:

```
# Persistent state per student (survives sessions; horizon = years):
#   knowledge graph: concepts + prerequisite edges (from curriculum)
#   per concept: mastery belief (BKT-style L with decay), stability S,
#                last_retrieval, error patterns, effective explanation styles
#   learner profile: interests, self-efficacy signals, help-use patterns,
#                    Elo-style ability rating per topic

each session:
    due      = concepts where predicted_recall(now, S, last_retrieval) < 0.90
    frontier = unmastered concepts whose prerequisites are all mastered
    agenda   = interleave(due_retrievals, frontier_instruction)
               # interleave across confusable topics; bias gaps long when unsure

    for item in agenda:
        mode = select_pedagogy(item):
            new concept, low prior      -> (optional bounded struggle /
                                            pretest question first, if age-
                                            appropriate) then direct
                                            instruction + worked example
            partial mastery             -> completion problems, guided practice
            mastered, retrieval due     -> effortful retrieval, then feedback;
                                           keep in queue past first success
                                           (3 recalls + 3 spaced relearnings)
            fragile (correct, low conf) -> "explain your reasoning" probe
            repeated failure            -> walk prerequisite graph backward

        response = elicit(item, mode)          # LLM: dialogue, hint ladder
        diagnosis = analyze(response)          # LLM: error/misconception ID
        give process-level feedback            # never person-level; delayed
                                               # feedback is fine, even good
        update L (Bayesian) and S (scheduler fit); update Elo; log evidence
        if answer-fishing / gaming detected: tighten hint ladder, flag

    periodically:
        run transfer checks on untested sibling material   # Pan & Rickard
        surface the model to the student       # metacognition: "you're about
                                               # to forget X; here's your curve"
        report to teacher: struggling students, decayed load-bearing concepts
```

The claims embedded in this loop, each traceable to a result above: retrieval events outrank new
content (testing effect); items stay in the queue after first success (Karpicke & Roediger 2008);
the schedule follows per-concept stability, not the curriculum calendar (ridgeline), erring long
under uncertainty (asymmetric penalty); pedagogy mode is a function of the per-concept knowledge
state (expertise reversal / guidance fading), with question-before-explanation as the default
(pretesting); advancement requires demonstrated mastery plus scheduled reactivation (mastery
learning + forgetting); feedback is process-level and always attached to retrieval (Rowland's
feedback moderator; Hattie & Timperley); transfer is verified, not assumed (Pan & Rickard); the
model is interpretable enough to justify decisions and to be surfaced to the student as
metacognitive training (Schraw, 1998; Kornell & Bjork 2007's 18% statistic is the gap to close);
and the teacher stays in the loop as the relational and motivational anchor, with the system as
force multiplier.

What this architecture does *not* solve — the honest open problems: the **motivation cliff**
(spaced retrieval works and is disliked; narrative framing and visible retention wins are
mitigations, not solutions), the **cold start** (a new student's parameters are unknown;
diagnostic pretests, population priors, and a few Elo-calibration items only roughly help), the
**relationship problem** (no deployed system maintains a coherent, trusted persona and student
model over years — the gap between current tooling and a Diamond Age Primer is precisely
persistence, not language capability), and **measurement** (distinguishing real mastery from
fragile knowledge at scale still lacks a validated, cheap instrument; LLM-graded explanations are
promising and unproven — and note that no LLM-tutor RCT has yet reported delayed-retention
outcomes, so the field is still grading itself on the performance side of the
performance/learning dissociation). These four, not explanation generation, are where the
research frontier actually is.

## Sources

- Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A
  meta-analysis of practice testing. *Review of Educational Research*, 87(3), 659–701.
- Agarwal, P. K., & Bain, P. M. (2019). *Powerful Teaching: Unleash the Science of Learning*.
  Jossey-Bass.
- Aleven, V., & Koedinger, K. R. (2000). Limitations of student control: Do students know when
  they need help? *ITS 2000*, 292–303.
- Baker, R. S., Corbett, A. T., Koedinger, K. R., & Wagner, A. Z. (2004). Off-task behavior in
  the Cognitive Tutor classroom: When students "game the system." *CHI 2004*, 383–390.
- Baker, R. S., Corbett, A. T., & Aleven, V. (2008). More accurate student modeling through
  contextual estimation of slip and guess probabilities in Bayesian knowledge tracing. *ITS 2008*.
- Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change.
  *Psychological Review*, 84(2), 191–215.
- Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., & Mariman, R. (2025). Generative AI
  can harm learning. *PNAS*, 122(26).
- Beck, J. E., & Chang, K. (2007). Identifiability: A fundamental problem of student modeling.
  *User Modeling 2007*, LNCS 4511, 137–146.
- Bergeron, P.-J., & Rivard, L. (2017). How to engage in pseudoscience with real data: A
  criticism of John Hattie's arguments in Visible Learning from the perspective of a
  statistician. *McGill Journal of Education*, 52(1).
- Birnbaum, M. S., Kornell, N., Bjork, E. L., & Bjork, R. A. (2013). Why interleaving enhances
  inductive learning: The roles of discrimination and retrieval. *Memory & Cognition*, 41(3),
  392–402.
- Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018). Inducing self-explanation:
  A meta-analysis. *Educational Psychology Review*, 30(3), 703–725.
- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In
  *Metacognition: Knowing about Knowing* (pp. 185–205). MIT Press.
- Bjork, R. A., & Bjork, E. L. (1992). A new theory of disuse and an old theory of stimulus
  fluctuation. In *From Learning Processes to Cognitive Processes* (Vol. 2, pp. 35–67). Erlbaum.
- Bloom, B. S. (1968). Learning for mastery. *Evaluation Comment*, 1(2), 1–12.
- Bloom, B. S. (1984). The 2 sigma problem: The search for methods of group instruction as
  effective as one-to-one tutoring. *Educational Researcher*, 13(6), 4–16.
- Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning
  and its moderators. *Psychological Bulletin*, 145(11), 1029–1052.
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the
  negative effects of multiple-choice testing. *Memory & Cognition*, 36(3), 604–616.
- Carroll, J. B. (1963). A model of school learning. *Teachers College Record*, 64(8), 723–733.
- Carvalho, P. F., & Goldstone, R. L. (2014). Putting category learning in order: Category
  structure and temporal arrangement affect the benefit of interleaved over blocked study.
  *Memory & Cognition*, 42(3), 481–495.
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in
  verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3),
  354–380.
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in
  learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11),
  1095–1102.
- Chi, M. T. H., & Wylie, R. (2014). The ICAP framework: Linking cognitive engagement to active
  learning outcomes. *Educational Psychologist*, 49(4), 219–243.
- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of
  procedural knowledge. *User Modeling and User-Adapted Interaction*, 4(4), 253–278.
- Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental
  storage capacity. *Behavioral and Brain Sciences*, 24(1), 87–114.
- Credé, M., Tynan, M. C., & Harms, P. D. (2017). Much ado about grit: A meta-analytic synthesis
  of the grit literature. *Journal of Personality and Social Psychology*, 113(3), 492–511.
- De Simone, M., Tiberti, F., Barron Rodriguez, M., et al. (2025). *From Chalkboards to Chatbots:
  Evaluating a GenAI Intervention in Nigeria*. World Bank Policy Research Working Paper 11125.
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining
  the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6),
  627–668.
- Duckworth, A. L., Peterson, C., Matthews, M. D., & Kelly, D. R. (2007). Grit: Perseverance and
  passion for long-term goals. *Journal of Personality and Social Psychology*, 92(6), 1087–1101.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving
  students' learning with effective learning techniques. *Psychological Science in the Public
  Interest*, 14(1), 4–58.
- Ebbinghaus, H. (1885). *Über das Gedächtnis*. Duncker & Humblot.
- Education Endowment Foundation. *Teaching and Learning Toolkit: One-to-one tuition*.
  educationendowmentfoundation.org.uk.
- Gervet, T., Koedinger, K., Schneider, J., & Mitchell, T. (2020). When is deep learning the best
  approach to knowledge tracing? *Journal of Educational Data Mining*, 12(3), 31–54.
- Ghosh, A., Heffernan, N., & Lan, A. S. (2020). Context-aware attentive knowledge tracing.
  *KDD 2020*.
- Guskey, T. R. (2010). Lessons of mastery learning. *Educational Leadership*, 68(2), 52–57.
- Hattie, J. (2009). *Visible Learning*. Routledge. (Updated influence lists: visible-learning.org.)
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*,
  77(1), 81–112.
- Hidi, S., & Renninger, K. A. (2006). The four-phase model of interest development.
  *Educational Psychologist*, 41(2), 111–127.
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect.
  *Educational Psychologist*, 38(1), 23–31.
- Kang, S. H. K. (2016). Spaced repetition promotes efficient and effective learning. *Policy
  Insights from the Behavioral and Brain Sciences*, 3(1), 12–19.
- Kang, S. H. K., & Pashler, H. (2012). Learning painting styles: Spacing is advantageous when it
  promotes discriminative contrast. *Applied Cognitive Psychology*, 26(1), 97–103.
- Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than
  elaborative studying with concept mapping. *Science*, 331(6018), 772–775.
- Karpicke, J. D., & Roediger, H. L. (2007). Expanding retrieval practice promotes short-term
  retention, but equally spaced retrieval enhances long-term retention. *Journal of Experimental
  Psychology: Learning, Memory, and Cognition*, 33(4), 704–719.
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning.
  *Science*, 319(5865), 966–968.
- Kestin, G., Miller, K., Klales, A., Milbourne, T., & Ponti, G. (2025). AI tutoring outperforms
  in-class active learning. *Scientific Reports*, 15, 17458.
- Khajah, M., Lindsey, R. V., & Mozer, M. C. (2016). How deep is knowledge tracing? *EDM 2016*.
- Kirschner, P. A., Sweller, J., & Clark, R. E. (2006). Why minimal guidance during instruction
  does not work. *Educational Psychologist*, 41(2), 75–86.
- Klinkenberg, S., Straatemeier, M., & van der Maas, H. L. J. (2011). Computer adaptive practice
  of maths ability using a new item response model for on the fly ability and difficulty
  estimation. *Computers & Education*, 57(2), 1813–1824.
- Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance.
  *Psychological Bulletin*, 119(2), 254–284.
- Kornell, N., & Bjork, R. A. (2007). The promise and perils of self-regulated study.
  *Psychonomic Bulletin & Review*, 14(2), 219–224.
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of
  induction"? *Psychological Science*, 19(6), 585–592.
- Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance
  subsequent learning. *Journal of Experimental Psychology: Learning, Memory, and Cognition*,
  35(4), 989–998.
- Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). Effectiveness of mastery learning
  programs: A meta-analysis. *Review of Educational Research*, 60(2), 265–299.
- Kulik, C.-L. C., & Kulik, J. A. (1991). Effectiveness of computer-based instruction: An updated
  analysis. *Computers in Human Behavior*, 7(1-2), 75–94.
- Kulik, J. A., & Fletcher, J. D. (2016). Effectiveness of intelligent tutoring systems: A
  meta-analytic review. *Review of Educational Research*, 86(1), 42–78.
- Landauer, T. K., & Bjork, R. A. (1978). Optimum rehearsal patterns and name learning. In
  *Practical Aspects of Memory* (pp. 625–632). Academic Press.
- Lepper, M. R., Greene, D., & Nisbett, R. E. (1973). Undermining children's intrinsic interest
  with extrinsic reward. *Journal of Personality and Social Psychology*, 28(1), 129–137.
- Lindsey, R. V., Shroyer, J. D., Pashler, H., & Mozer, M. C. (2014). Improving students'
  long-term knowledge retention through personalized review. *Psychological Science*, 25(3),
  639–647.
- Ma, W., Adesope, O. O., Nesbit, J. C., & Liu, Q. (2014). Intelligent tutoring systems and
  learning outcomes: A meta-analysis. *Journal of Educational Psychology*, 106(4), 901–918.
- Mazza, S., Gerbier, E., Gustin, M.-P., Kasikci, Z., Koenig, O., Toppino, T. C., & Magnin, M.
  (2016). Relearn faster and retain longer: Along with practice, sleep makes perfect.
  *Psychological Science*, 27(10), 1321–1330.
- McDaniel, M. A., Agarwal, P. K., Huelser, B. J., McDermott, K. B., & Roediger, H. L. (2011).
  Test-enhanced learning in a middle school science classroom. *Journal of Educational
  Psychology*, 103(2), 399–414.
- Multon, K. D., Brown, S. D., & Lent, R. W. (1991). Relation of self-efficacy beliefs to academic
  outcomes. *Journal of Counseling Psychology*, 38(1), 30–38.
- Murray, T., & Arroyo, I. (2002). Toward measuring and maintaining the zone of proximal
  development in adaptive instructional systems. *ITS 2002*, 749–758.
- Murre, J. M. J., & Dros, J. (2015). Replication and analysis of Ebbinghaus' forgetting curve.
  *PLOS ONE*, 10(7), e0120644.
- Nickow, A., Oreopoulos, P., & Quan, V. (2020). The impressive effects of tutoring on preK-12
  learning: A systematic review and meta-analysis of the experimental evidence. *NBER Working
  Paper 27476*. (Published 2024 in *American Educational Research Journal*.)
- Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: Meta-analytic review
  and synthesis. *Psychological Bulletin*, 144(7), 710–756.
- Pandey, S., & Karypis, G. (2019). A self-attentive model for knowledge tracing. *EDM 2019*.
- Pane, J. F., Griffin, B. A., McCaffrey, D. F., & Karam, R. (2014). Effectiveness of Cognitive
  Tutor Algebra I at scale. *Educational Evaluation and Policy Analysis*, 36(2), 127–144.
- Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and
  evidence. *Psychological Science in the Public Interest*, 9(3), 105–119.
- Pavlik, P. I., Cen, H., & Koedinger, K. R. (2009). Performance factors analysis — a new
  alternative to knowledge tracing. *AIED 2009*.
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems.
  *Computers & Education*, 98, 169–179.
- Piech, C., Bassen, J., Huang, J., Ganguli, S., Sahami, M., Guibas, L. J., & Sohl-Dickstein, J.
  (2015). Deep knowledge tracing. *NeurIPS 2015*.
- Pyc, M. A., & Rawson, K. A. (2009). Testing the retrieval effort hypothesis. *Journal of Memory
  and Language*, 60(4), 437–447.
- Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and
  efficient learning: How much is enough? *Journal of Experimental Psychology: General*, 140(3),
  283–302.
- Renkl, A., & Atkinson, R. K. (2003). Structuring the transition from example study to problem
  solving in cognitive skill acquisition. *Educational Psychologist*, 38(1), 15–22.
- Richland, L. E., Kornell, N., & Kao, L. S. (2009). The pretesting effect: Do unsuccessful
  retrieval attempts enhance learning? *Journal of Experimental Psychology: Applied*, 15(3),
  243–257.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves
  long-term retention. *Psychological Science*, 17(3), 249–255.
- Roediger, H. L., Agarwal, P. K., McDaniel, M. A., & McDermott, K. B. (2011). Test-enhanced
  learning in the classroom: Long-term improvements from quizzing. *Journal of Experimental
  Psychology: Applied*, 17(4), 382–395.
- Rohrer, D. (2012). Interleaving helps students distinguish among similar concepts. *Educational
  Psychology Review*, 24, 355–367.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning.
  *Instructional Science*, 35(6), 481–498.
- Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics
  learning. *Journal of Educational Psychology*, 107(3), 900–908.
- Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled
  trial of interleaved mathematics practice. *Journal of Educational Psychology*, 112(1), 40–52.
- Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review
  of the testing effect. *Psychological Bulletin*, 140(6), 1432–1463.
- Schraw, G. (1998). Promoting general metacognitive awareness. *Instructional Science*, 26(1–2),
  113–125.
- Seabrook, R., Brown, G. D., & Solity, J. E. (2005). Distributed and massed practice: From
  laboratory to classroom. *Applied Cognitive Psychology*, 19(1), 107–122.
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning.
  *ACL 2016*, 1848–1858.
- Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works: Evidence for
  productive failure. *Review of Educational Research*, 91(5), 761–798.
- Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent
  and under which circumstances are growth mind-sets important to academic achievement?
  *Psychological Science*, 29(4), 549–571.
- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon.
  *Journal of Experimental Psychology: Human Learning and Memory*, 4(6), 592–604.
- Slavin, R. E. (1987). Mastery learning reconsidered. *Review of Educational Research*, 57(2),
  175–213.
- Smith, M. A., & Karpicke, J. D. (2014). Retrieval practice with short-answer, multiple-choice,
  and hybrid tests. *Memory*, 22(7), 784–802.
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance: An integrative review.
  *Perspectives on Psychological Science*, 10(2), 176–199.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive
  Science*, 12(2), 257–285.
- Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem
  solving in learning algebra. *Cognition and Instruction*, 2(1), 59–89.
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (1998; updated 2019). Cognitive architecture
  and instructional design. *Educational Psychology Review*, 10(3), 251–296; 31, 261–292.
- Tabibian, B., Upadhyay, U., De, A., Zarezade, A., Schölkopf, B., & Gomez-Rodriguez, M. (2019).
  Enhancing human learning via spaced repetition optimization. *PNAS*, 116(10), 3988–3993.
- VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems,
  and other tutoring systems. *Educational Psychologist*, 46(4), 197–221.
- Vansteenkiste, M., Simons, J., Lens, W., Sheldon, K. M., & Deci, E. L. (2004). Motivating
  learning, performance, and persistence. *Journal of Personality and Social Psychology*, 87(2),
  246–260.
- Vygotsky, L. S. (1978). *Mind in Society*. Harvard University Press.
- Wilson, K. H., Karklin, Y., Han, B., & Ekanadham, C. (2016). Back to the basics: Bayesian
  extensions of IRT outperform neural networks for proficiency estimation. *EDM 2016*, 539–544.
- Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A
  meta-analysis of educational feedback research. *Frontiers in Psychology*, 10, 3087.
- Wozniak, P. (1987/1990). The SM-2 algorithm. SuperMemo; super-memory.com/english/ol/sm2.htm.
- Xiong, X., Zhao, S., Van Inwegen, E. G., & Beck, J. E. (2016). Going deeper with deep knowledge
  tracing. *EDM 2016*, 545–550.
- Yeager, D. S., et al. (2019). A national experiment reveals where a growth mindset improves
  achievement. *Nature*, 573, 364–369.
- Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced
  repetition scheduling. *KDD 2022*, 4381–4390. (DSR model underlying FSRS; benchmark:
  github.com/open-spaced-repetition/srs-benchmark.)
- Zhang, J., Shi, X., King, I., & Yeung, D.-Y. (2017). Dynamic key-value memory networks for
  knowledge tracing. *WWW 2017*.

Research provenance: distilled from the deep-research reports in
`brain/inbox/dr/2026-07-24-long-term-learning/` (synthesis.md, comprehensive-report.md). All
quantitative claims were subsequently verified against the primary papers (full texts or
publisher abstracts) in a six-stream verification pass on 2026-08-02; numbers in the generated
reports that disagreed with the original papers were corrected here, including the Rohrer
interleaving scores, the VanLehn substep effect size (0.40, not 0.95), the Kulik mastery-learning
figures, and the Cepeda gap-ratio guidance.
