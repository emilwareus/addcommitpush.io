---
type: insight
title: "Post-Training Open-Weight LLMs: From First Run to Production"
slug: post-training-open-weight-llms
created: 2026-09-02
status: working
publish: true
tags:
  - machine learning
related:
  - "[[designing-learning-loops-in-harnesses]]"
---

# Post-Training Open-Weight LLMs: From First Run to Production

Post-training changes a pretrained large language model (LLM) so that it follows instructions,
uses tools, or performs a domain task in a specified way. It is a family of methods. It is not
another name for reinforcement learning. For most first projects, the correct starting point
is a small, high-quality supervised data set and a low-rank adaptation (LoRA) or quantized
LoRA (QLoRA) adapter. Reinforcement learning becomes useful only when the model must explore
several possible answers and a reliable reward can score those answers. The main engineering
work is data and evaluation. The trainer is only one component.

This guide has three levels. Level 1 gives a plain-language model and a first plan. Level 2
shows data, hardware, and an end-to-end workflow. Level 3 explains the objectives and
algorithms in enough detail to implement or audit them.

## Level 1: The basic model

### What post-training is

A base language model learns to predict the next token from a large text collection.
It can contain much useful knowledge, but it does not yet have a reliable product behavior.
Post-training continues optimization after that general pretraining stage. The new objective
can teach a response format, a task, a preference, a tool policy, or a domain distribution.
The [Llama 3 model report](https://arxiv.org/abs/2407.21783) uses the broad term in this way
and describes six rounds that combine supervised fine-tuning and preference optimization.

```text
base checkpoint
      |
      v
frozen baseline and held-out evaluation
      |
      v
supervised fine-tuning (usually first)
      |
      +------> preference training (only if ranking is the useful signal)
      |
      +------> reinforcement learning (only if exploration and reward are useful)
      |
      v
regression tests, release decision, and versioned deployment
```

Post-training changes model parameters. Prompt engineering, retrieval-augmented generation
(RAG), tool code, and agent memory do not. Those system methods can still be the correct
solution. Use retrieval when facts change often or an answer must cite its source. Use
post-training when the required behavior must be reliable across many prompts or when the
model must learn a policy that a prompt cannot specify well.

The phrase "referral learning" is not a standard term here. The likely term is
**reinforcement learning**. Reinforcement learning, or RL, is one optional type of
post-training. Continued pretraining and SFT are not RL. DPO is offline preference training
with an RL derivation. PPO and GRPO are RL methods because they learn from sampled actions and
rewards.

### The five common methods

| Method | Plain meaning | Data | Best use |
| --- | --- | --- | --- |
| Continued pretraining (CPT) | Continue next-token training on domain text | Unlabeled documents or code | The model lacks broad domain language or knowledge |
| Supervised fine-tuning (SFT) | Show the model the response that it should produce | Prompt and target response | The correct output or action is known |
| Direct preference optimization (DPO) | Show which of two responses is better | Prompt, chosen response, rejected response | Experts can compare outputs more easily than write a perfect one |
| RL with human or model feedback | Generate outputs, score them with a learned reward, then update the policy | Prompts, comparisons, reward model | A useful preference cannot be reduced to a deterministic rule |
| RL with verifiable rewards (RLVR) | Generate several attempts and score them with tests or rules | Prompts, environment, verifier | Code, math, tool use, and other tasks with reliable checks |

The stages can be combined. [Tulu 3](https://arxiv.org/abs/2411.15124) releases checkpoints
for a base model, SFT, DPO, and RLVR. This sequence is evidence that a complete open recipe is
possible. It is not evidence that every project needs all stages.

These words occur throughout the guide:

| Term | Meaning here |
| --- | --- |
| Checkpoint | One saved model state |
| Policy | The model distribution that selects each next token |
| Reference policy | A fixed model used to measure how far the trained policy moves |
| Rollout | One generated response or task attempt, including tool actions |
| Verifier | A program or review procedure that scores an output |
| Adapter | A small set of added trainable parameters while the base stays fixed |
| Chat template | The exact rule that converts roles and messages into tokens |
| Frozen | Deliberately held unchanged during a training or evaluation step |

### Choose the method from the available feedback

Use this decision sequence:

1. **Does the model already know enough to attempt the task?** If no, and you have a large
   body of stable domain text, consider continued pretraining. If the facts change often,
   use retrieval.
2. **Can an expert write or approve a target output?** If yes, use SFT.
3. **Can an expert reliably select the better of two outputs?** If yes, but no single target
   is canonical, use DPO.
4. **Can software or a strict rubric score an attempt?** If yes, and several attempts help,
   consider RLVR.
5. **Is the only signal a vague preference?** Use a learned reward and online RL only when
   SFT and offline preference training do not meet the requirement.

Do not start with RL because it sounds more advanced. Start with the least complex objective
that represents the feedback. Every additional model, sampler, and reward component creates
another failure surface.

### Open source is not the same as open weight

A downloadable checkpoint is often called an open-source model. That name can be incorrect.
The [Open Source AI Definition 1.0](https://opensource.org/ai/open-source-ai-definition)
requires the freedom to use, study, modify, and share a system. It also requires the preferred
form for modification. This form includes sufficient data information, complete code, and
model parameters. A release that gives weights but not enough training information is better
called **open weight**.

Before training, record these terms:

- the model license and acceptable-use terms;
- whether derivative weights and adapters can be distributed;
- the license and provenance of each training data source;
- whether model-generated data inherits provider terms;
- the tokenizer, chat template, base revision, and code revision;
- whether the released artifact is a merged model or an adapter.

This record is part of reproducibility. It also prevents a successful experiment from
becoming an artifact that cannot be deployed.

A base checkpoint gives the most control, but it does not yet have a dependable chat policy.
An instruct checkpoint already has instruction and safety post-training. For a first narrow
domain project, start with the smallest compatible instruct checkpoint that has sufficient
baseline quality and meets the latency, license, and deployment limits. Use a base checkpoint
when the goal requires a new general instruction policy or a large continued-pretraining
stage. An instruct checkpoint's
existing preferences can help or conflict with the new target, so measure the unmodified
checkpoint first.

## Level 2: A first post-training project

### Start with an evaluation contract

Do not first ask, "Which trainer should I use?" First specify the state change that the
training must cause.

For example, consider a model that must review a group of contracts and produce a risk table.
A useful contract can be:

```yaml
task: contract-risk-table
input:
  - instruction
  - closed_set_of_contracts
output:
  format: validated_json
required_checks:
  - every contract_id appears exactly once
  - every quoted clause exists in its source document
  - every risk label follows the written rubric
  - no source outside the closed set is cited
primary_metric: task_all_pass_rate
secondary_metrics:
  - criterion_pass_rate
  - citation_precision
  - schema_validity
regression_suites:
  - general_instruction_following
  - refusal_and_data_handling
```

Freeze the task definitions, split, grader version, decoding settings, and base-model result.
If these items change during training, the comparison is no longer controlled.

Use three partitions. Training data supplies gradients. Development data supports checkpoint
selection and error analysis. The final test stays locked until a release candidate exists.
Both evaluation partitions must represent deployment. Do not randomly split near-duplicate
rows. Group by the unit that can leak: customer, matter, source document, template, author,
repository, or time period. Deduplicate before the split. Keep the final test away from prompt
generation, model selection, reward design, and repeated manual inspection.

### Use a data contract for each objective

#### SFT record

Use the same conversation form at training and inference. The current
[TRL SFT documentation](https://huggingface.co/docs/trl/sft_trainer) accepts plain text,
message conversations, and prompt-completion records. A message record is suitable for chat:

```json
{
  "example_id": "matter-017-task-04-v2",
  "messages": [
    {"role": "system", "content": "Return a source-grounded risk table."},
    {"role": "user", "content": "Review the attached contract set."},
    {"role": "assistant", "content": "{\"risks\":[...]}"}
  ],
  "source_ids": ["contract-81", "contract-82"],
  "split_group_id": "matter-017",
  "review": {
    "rubric_version": "risk-rubric-3",
    "reviewer_role": "qualified-domain-expert",
    "decision": "approved"
  }
}
```

Loss should normally apply only to assistant or completion tokens. Prompt tokens give the
model context, but they are not the desired response. The chat template must expose the
correct assistant-token mask. Its end-of-sequence token must also match inference. A template
mismatch can make a low training loss coexist with broken deployment behavior.

For tool use, preserve the exact tool schema, assistant tool call, tool result, and final
answer. Do not flatten these objects into prose if deployment uses structured calls. The TRL
SFT format supports conversation records with tool calls and JSON tool schemas.

Every assistant token used as an SFT target teaches imitation. Do not place a failed answer in
the target field and expect a separate score to negate it. Put failed outputs in preference
records, error-analysis records, or RL rollouts. If an SFT example explains an error, the
approved correction must still be the target response.

#### Preference record

```json
{
  "pair_id": "matter-017-task-04-pair-08",
  "prompt": [{"role": "user", "content": "Review the attached contract set."}],
  "chosen": [{"role": "assistant", "content": "..."}],
  "rejected": [{"role": "assistant", "content": "..."}],
  "preference_strength": "clear",
  "rubric_version": "risk-rubric-3",
  "annotator_ids": ["reviewer-12", "reviewer-31"],
  "adjudicator_id": "reviewer-05",
  "policy_revision": "base-instruct-sha",
  "split_group_id": "matter-017"
}
```

Store both outputs. Store the reason for the decision. Store ties or ambiguous pairs as such.
Do not force a preference when two responses are equivalent. The
[Llama 3 post-training report](https://arxiv.org/abs/2407.21783) describes
preference-strength labels and excludes pairs with no clear preference. This avoids turning
annotation noise into a strong gradient.

Preference data should come from the policy family that will be trained when possible. Pairs
from a much weaker or much stronger model can teach easy distinctions that the current policy
does not need.

#### RLVR task record

```json
{
  "task_id": "matter-017-task-04",
  "prompt": [{"role": "user", "content": "Review the attached contract set."}],
  "environment_version": "legal-sandbox-6",
  "verifier_version": "risk-verifier-3",
  "reward_components": {
    "schema": 0.1,
    "source_grounding": 0.4,
    "rubric": 0.5
  },
  "split_group_id": "matter-017"
}
```

Save each rollout with its policy revision, decoding parameters, random seed, tool trace,
reward components, and verifier output. A scalar total is not enough for diagnosis.

#### Continued-pretraining record

Continued pretraining uses raw token sequences, not instruction and answer pairs. Preserve
document boundaries, source rights, dates, language, and deduplication keys. Mix some general
data when experiments show unacceptable forgetting. Continued pretraining can be much more
expensive than SFT because it uses many more tokens. The
[Llama 3 report](https://arxiv.org/abs/2407.21783) states that its code-specialist path used a
one-trillion-token mix with more than 85 percent code. That scale is
different from a small behavior adapter.

### What data is actually needed

Data volume has no universal answer. The needed amount depends on the number and diversity of
valid outputs, the base model, label noise, output length, coverage, and how far the target
policy is from the starting policy.

[LIMA](https://arxiv.org/abs/2305.11206) is a useful lower-end existence result. Its authors
fine-tuned a 65B base model on 1,000 curated examples without RL. The result supports a narrow
claim: a capable base can learn some response behavior from a small, high-quality set. It does
not prove that 1,000 examples cover a broad assistant or a specialist domain.

Tulu 3 shows the other end of the design. Its source pool contained 23,327,961 prompts. The
authors selected 939,344 for SFT and 425,145 for preference data, with model-specific mixture
details. They filtered and decontaminated data across general instruction following, math,
code, safety, multilingual behavior, and precise instruction following. The size follows the
breadth of the desired policy.

For a first narrow pilot, use this practical sequence:

1. Write 20 to 50 development tasks before training. Create a separate final test. Size that
   test for the minimum improvement that matters to the product.
2. Collect 100 to 500 approved demonstrations that cover the main task families and known
   failure modes.
3. Prove that the pipeline can overfit 16 to 32 examples. This checks the loss mask, labels,
   optimizer, template, and adapter path.
4. Train the pilot. Evaluate it on the frozen development split.
5. Add data for observed errors. Do not expand every category equally.
6. Increase to thousands of examples only when the learning curve and error distribution
   justify it.

These counts are an engineering starting point, not a research law. They support a pilot, not
a precise final performance claim. A task with many output forms, rare edge cases, or long
tool trajectories needs more coverage.

### Synthetic data is useful only with a quality gate

Synthetic examples can cover rare cases and reduce writing cost. They also copy the teacher's
errors, style, blind spots, and answer-length bias. The Llama 3 team states that most of its
post-training data was model-generated. It used rule filters, reward and model-judge scores,
semantic deduplication, data categories, and adjusted mixture weights across rounds. It also
reported substantial disagreement between two quality scorers. That disagreement is a reason
to inspect synthetic data, not a reason to average scores and assume truth.

Use this generation path:

```text
real task seed
    -> controlled variation or teacher generation
    -> deterministic schema and source checks
    -> domain rubric review
    -> deduplication against train and evaluation data
    -> accepted training record with provenance
```

Do not train on a teacher answer only because it is fluent. For grounded tasks, verify every
citation or extracted value against the source. For code, execute tests in a sandbox. For
math, verify the final answer and, when possible, intermediate constraints. For open-ended
professional work, use qualified reviewers and a written rubric.

### What "human-verified" means

"Human-verified" does not mean "true." It means that a recorded human process checked an
artifact under stated conditions. The phrase is incomplete unless the data gives the process.

| Label | Human action | Valid claim | Missing claim |
| --- | --- | --- | --- |
| Human-originated | A person supplied the prompt or work item | The task came from a person | The response is correct |
| Human-written | A person wrote the target response | The target is not only model output | The writer has domain expertise |
| Human-ranked | A person selected or ranked model outputs | One output matched that person's rubric better | The chosen output is fully correct |
| Human-reviewed | A person checked an output against a rubric | The stated checks were performed | Unchecked facts are correct |
| Expert-adjudicated | A qualified expert resolved review disagreement | A named expert process made the final decision | The rubric has complete coverage |

The [InstructGPT paper](https://arxiv.org/abs/2203.02155) gives a concrete example. About 40
screened contractors wrote demonstrations and ranked outputs. The project used onboarding,
detailed instructions, and a shared question channel. Training annotators agreed on pairwise
comparisons 72.6 plus or minus 1.5 percent of the time. Held-out annotators agreed 77.3 plus or
minus 1.3 percent of the time. Most comparisons had only one label because more labels cost
more. The authors also state that the labeler group was mainly English-speaking and was not
representative of all affected users.

This evidence gives two lessons. First, annotation is a measured production process. Second,
disagreement is normal. It can show an unclear rubric, a subjective preference, insufficient
context, or a real expert dispute.

A useful verification record contains:

- stable artifact and reviewer identifiers;
- reviewer role, qualification, and conflict rules;
- rubric and policy versions;
- the exact fields or claims that were checked;
- independent review count;
- agreement and adjudication result;
- timestamp and data-source versions;
- rejection reason and correction history.

Constitutional AI uses a different allocation of human work. A model critiques, revises, and
compares responses under written principles, then an AI preference model supplies training
feedback. The [Constitutional AI paper](https://arxiv.org/abs/2212.08073) does not remove
humans from the system. Humans still select the principles, training design, and evaluation.

### Estimate hardware from state, not model name

Graphics processing unit (GPU) memory has four main groups:

```text
peak memory = model state
            + activations
            + temporary kernels and communication buffers
            + allocator and framework overhead
```

Model state includes parameters, gradients, and optimizer states. Activations depend strongly
on sequence length, tokens per batch, layer count, hidden width, attention implementation, and
whether activation checkpointing is enabled. This is why a claim such as "a 32B model needs
one 48 GB GPU" is not a complete specification.

For a mixture-of-experts model, distinguish total and active parameters. Total parameters
affect weight storage. Active parameters per token affect much of the forward compute. An
active-parameter count is not a memory-capacity estimate.

The [Transformers memory anatomy guide](https://huggingface.co/docs/transformers/model_memory_anatomy)
gives a common mixed-precision Adam estimate of 18 bytes per trainable parameter before
activations and temporary memory: 6 bytes for the two weight copies, 8 bytes for Adam states,
and 4 bytes for gradients. The table below applies that formula. It also shows bfloat16
(BF16) weights alone and raw 4-bit weights alone. These are computed lower bounds, not fit
guarantees.

| Parameter count | BF16 weights only | Mixed-precision Adam state | Raw 4-bit weights only |
| ---: | ---: | ---: | ---: |
| 8B | 14.9 GiB | 134.1 GiB | 3.7 GiB |
| 14B | 26.1 GiB | 234.7 GiB | 6.5 GiB |
| 32B | 59.6 GiB | 536.4 GiB | 14.9 GiB |
| 70B | 130.4 GiB | 1,173.5 GiB | 32.6 GiB |

The table explains the method choices:

- **Full fine-tuning** updates all parameters. It needs gradients and optimizer states for all
  parameters. An 8B model already needs more than 134 GiB for common model state before
  activations. Multi-GPU sharding is normal.
- **LoRA** keeps base parameters frozen and trains small low-rank matrices. It removes most
  gradient and optimizer state, but it still stores the base and activations.
- **QLoRA** also stores the frozen base in a low-bit format. It reduces base-weight memory,
  but quantization metadata, adapters, activations, temporary dequantization, and runtime
  overhead remain.
- **RL** can need an actor, a frozen reference, a reward model, and sometimes a value model.
  It also stores generated rollouts. Placement and offload strategy can matter more than the
  actor's parameter count alone.

The [QLoRA paper](https://arxiv.org/abs/2305.14314) trained a 65B model on one 48 GB GPU by
using a frozen 4-bit base, NormalFloat 4 (NF4) quantization, double quantization, paged
optimizers, and LoRA.
This is proof of feasibility for the paper's configuration. It is not a promise that any 65B
or 70B model, sequence length, batch, or trainer fits in 48 GB.

The following table is a feasibility screen. It is not a purchasing guide or fit promise.

| Available memory | Reasonable first fit test | Why it is only a candidate |
| ---: | --- | --- |
| 24 GiB | 8B LoRA or QLoRA; 14B QLoRA | Context and activation peaks can still exceed memory |
| 48 GiB | 8B to 14B LoRA; up to 32B QLoRA | Adapter targets, sequence length, and kernels control the peak |
| 80 GiB | 32B LoRA or QLoRA; 70B QLoRA | A 70B raw 4-bit base is already about 32.6 GiB |
| Several GPUs | Full fine-tuning or larger RL roles after sharding design | Aggregate memory needs communication and gathers |

These candidates follow the computed lower bounds and the QLoRA existence result. Confirm
them with the measured fit test below.

An online RL job has two different loads:

```text
prompt batch -> rollout workers -> verifier or reward -> rollout buffer -> training workers
                    |                                           |
                    +---- key-value cache and tool state         +---- actor and value update
```

Rollout workers need fast decoding and key-value-cache capacity. Training workers need
backward-pass and optimizer capacity. A small job can place these roles on the same GPUs at
different times. A larger job can separate them so that generation and training overlap.
Separation increases throughput only when scheduling and model-weight synchronization cost
less than the idle time that it removes. Measure actor, reference, reward, value, verifier,
and rollout-buffer memory separately.

Use a measured fit test for the exact job:

1. Load the exact checkpoint, quantization, tokenizer, and adapter targets.
2. Use the planned sequence-length distribution and one microbatch. A microbatch is the set
   of examples processed in one forward and backward pass.
3. Run forward, backward, optimizer step, and evaluation generation.
4. Record allocated and reserved peak memory.
5. Increase token batch size until measured throughput stops improving or memory becomes too
   close to capacity.
6. Keep capacity for evaluation and checkpoint save peaks.

Current accelerator capacities range widely. For example, NVIDIA lists 80 GB for H100, 141 GB
for H200, and 180 GB for B200 per GPU in its
[HGX component documentation](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory-h100-h200-b200/latest/components.html).
Capacity does not predict speed by itself. Memory bandwidth, matrix format support, links
between GPUs, host memory, storage, and software kernels also matter.

### What LoRA changes

For a dense projection with input width `d_in` and output width `d_out`, LoRA keeps the dense
matrix `W` frozen. It learns two matrices with rank `r`:

```text
W' x = W x + scale * B A x

A shape: r by d_in
B shape: d_out by r
trainable parameters: r * (d_in + d_out)
```

For a 4,096 by 4,096 projection and rank 16, the adapter has 131,072 parameters. The dense
projection has 16,777,216. The adapter is 0.78125 percent of that projection. The
[LoRA paper](https://arxiv.org/abs/2106.09685) shows why this can reduce trainable state by
orders of magnitude. It does not remove the frozen base from memory. It also does not make
activation memory small.

Adapter rank, target modules, scale, dropout, and learning rate are part of the model. Record
them. A low rank can underfit a large behavior change. Applying adapters to more projections
increases capacity and state. The only reliable choice is a learning curve on the target
evaluation.

### Memory and speed techniques solve different problems

| Technique | Primary effect | Cost or limit |
| --- | --- | --- |
| BF16 or 16-bit floating point (FP16) | Reduces state and increases tensor-core throughput | Numeric behavior depends on hardware and operation |
| LoRA | Reduces trainable parameters and optimizer state | Base weights and activations remain |
| QLoRA | Reduces frozen base-weight memory | Adds quantization and dequantization work |
| Activation checkpointing | Recomputes activations instead of storing all of them | More forward compute during backward |
| FlashAttention | Reduces attention memory traffic with exact tiled attention | Benefit depends on shape and supported kernels |
| FSDP or ZeRO stage 3 | Shards parameters, gradients, and optimizer state | Communication and temporary gathers remain |
| Sequence parallelism | Splits sequence-dependent state across workers | Adds communication and implementation constraints |
| CPU or NVMe offload | Moves some state out of GPU memory | Transfer can reduce throughput sharply |
| Packing | Puts several short examples in one sequence | Requires correct boundaries, masks, and position handling |

[Zero Redundancy Optimizer (ZeRO)](https://arxiv.org/abs/1910.02054) and
[PyTorch Fully Sharded Data Parallel (FSDP)](https://docs.pytorch.org/docs/main/fsdp.html)
reduce replicated model state.
They are capacity techniques, not automatic speed techniques. [FlashAttention](https://arxiv.org/abs/2205.14135)
computes exact attention with tiles that reduce traffic to high-bandwidth memory. Its reported
speedups are workload and hardware results, not constants.

Packing needs special care. Without a block-diagonal attention mask or another supported
isolation method, a later example can attend to an earlier example in the same packed
sequence. That creates a train-time context that deployment will not have.

For a first project, start with the smallest capable open-weight checkpoint and an adapter.
Use one GPU if the measured job fits with operating margin. Add sharding only when the model,
sequence, or batch requirement needs it. Distributed training can make a small job slower if
communication is larger than the saved compute time.

### How to finish the first useful cycle fast

Speed means time to a trusted result, not examples per second alone. A fast training run with
a contaminated test set is a slow project because it must be repeated.

For the first SFT or DPO project, use one small software stack:

- Transformers for the model, tokenizer, and template;
- [Parameter-Efficient Fine-Tuning (PEFT)](https://huggingface.co/docs/peft/index) for LoRA;
- TRL for the SFT or DPO objective;
- [Accelerate](https://huggingface.co/docs/accelerate/index) for device placement and later
  distributed execution;
- [bitsandbytes](https://huggingface.co/docs/bitsandbytes/index) only when the run uses
  low-bit base weights.

Start from the official recipe for the exact checkpoint. Keep library and checkpoint revisions
fixed. Do not begin with an RL orchestration framework when the first objective is SFT.

Every run should have a machine-readable manifest like this:

```yaml
run_id: contract-risk-sft-004
base_model: organization/model@immutable-revision
tokenizer: organization/model@immutable-revision
chat_template_sha256: "..."
objective: assistant-only-sft
precision:
  base_storage: nf4
  compute: bfloat16
adapter:
  type: lora
  rank: 16
  alpha: 32
  target_modules: [q_proj, k_proj, v_proj, o_proj]
data:
  train_manifest_sha256: "..."
  development_manifest_sha256: "..."
  final_test_manifest_sha256: "..."
optimization:
  max_sequence_tokens: 4096
  global_sequence_tokens_per_step: 32768
  learning_rate: "declared-value"
  step_budget: "declared-value"
evaluation:
  grader_version: risk-verifier-3
  decoding_profile: deterministic-v2
```

The rank and scale in this example are illustrative. Select them with development results.
The manifest shape is the important part.

Use this order:

1. **Freeze acceptance tests.** Include a base-model result and important regressions.
2. **Select the smallest viable checkpoint.** Confirm the license, context size, tokenizer,
   and chat template.
3. **Lint the data.** Check roles, empty responses, token lengths, special tokens, duplicate
   groups, source rights, and split leakage.
4. **Overfit 16 to 32 examples.** The loss should decrease and decoded outputs should match
   the targets. If it does not, fix the pipeline.
5. **Run a small SFT adapter.** Use a fixed seed and save periodic checkpoints.
6. **Evaluate checkpoints on the frozen development set.** Training loss is not the deployment
   metric. The [InstructGPT study](https://arxiv.org/abs/2203.02155) selected an SFT checkpoint
   by reward-model and human behavior even after validation loss appeared to overfit.
7. **Classify errors.** Separate knowledge, instruction, format, tool, grounding, refusal,
   and verifier errors.
8. **Add targeted data.** Change the data mixture according to the observed error counts.
9. **Use DPO or RL only for a remaining preference or exploration problem.** Do not add a
   stage without a measured reason.
10. **Run the final test once, then package the full inference contract.** Version weights or
    adapter, tokenizer, template, generation parameters, tool schemas, and evaluation report
    together.

Two equations help plan time:

```text
SFT optimizer steps = ceil(
    epochs * total_sequence_tokens / global_sequence_tokens_per_step
)

RL generated tokens = iterations * prompts_per_iteration
                    * completions_per_prompt * mean_completion_tokens
```

The sequence-token count determines most compute. The target-token count determines how much
supervised signal the batch contains. Measure tokens per second on the real sequence
distribution. Then estimate training time from the measured rate. Floating-point operation
(FLOP) estimates can compare configurations, but they do not include data
loading, checkpoint saves, evaluation, failed rollouts, tool latency, or communication stalls.

Optimize in this sequence:

1. Remove invalid and excessively long samples.
2. Bucket by length and pack short examples.
3. Use completion-only or assistant-only loss.
4. Use a supported efficient-attention kernel.
5. Increase tokens per microbatch until throughput no longer improves.
6. Use gradient accumulation to reach the desired global token batch.
7. Add activation checkpointing only if memory requires it.
8. Add FSDP, ZeRO, or sequence parallelism only if one worker cannot hold the job.
9. For RL, separate rollout serving from training and measure generated tokens per second.

The [Llama 3 team](https://arxiv.org/abs/2407.21783) used paged key-value-cache allocation for
rejection sampling and reported more than two times the throughput in its system. This is a
useful mechanism result. The numeric speedup is not portable to other models, output-length
distributions, or hardware.

The current [Transformers optimization overview](https://huggingface.co/docs/transformers/main/optimization_overview)
separates memory and speed methods for the same reason. Compilation, kernels, quantization,
caching, and parallelism have different effects. For RL systems, frameworks such as
[OpenRLHF](https://github.com/OpenRLHF/OpenRLHF) and [verl](https://verl.readthedocs.io/en/latest/)
can schedule training and high-throughput generation. A framework removes integration work.
It does not select a correct reward or clean the data.

## Level 3: Objectives and algorithms

### Continued pretraining

Continued pretraining uses the original next-token objective on a new text distribution. If a
document contains tokens `z_1...z_T`, the loss is:

```text
L_CPT(theta) = -sum_t log p_theta(z_t | z_<t) / T
```

It does not require instruction labels. It can change representations across the full model,
so full-parameter training is common. Adapter-based continued training is possible, but its
capacity for a large distribution change must be measured.

The key control is the token mixture. Too little domain text can have no useful effect. A
narrow mixture can reduce general capability. A common experiment compares several ratios of
domain and general text at a fixed token budget. It measures domain perplexity, which is the
exponential form of average token loss, downstream task quality, and general regressions. The
end of a token budget or a stable validation loss is only an optimization stop. The release
still depends on downstream task evaluation.

Use CPT for a distribution or knowledge gap. Use SFT for a response-policy gap. A team often
needs CPT followed by SFT because next-token training does not by itself teach the deployed
instruction format.

### Supervised fine-tuning

SFT uses teacher forcing. For prompt tokens `x`, response tokens `y_1...y_T`, parameters
`theta`, and response mask `m_t`, the loss is:

```text
L_SFT(theta) = -sum_t m_t * log p_theta(y_t | x, y_<t)
               / sum_t m_t
```

The model receives the correct earlier response tokens while it predicts each next token.
At inference it receives its own earlier tokens. This difference is exposure bias. It is one
reason that a low SFT loss does not guarantee stable long trajectories.

```text
algorithm SFT(dataset D, policy theta, optimizer opt):
    repeat until the selected checkpoint or step budget:
        batch <- next token-budgeted batch from D
        tokens, response_mask <- apply_deployment_chat_template(batch)
        logits <- policy_forward(theta, tokens)
        loss <- masked_next_token_cross_entropy(logits, tokens, response_mask)
        gradients <- backward(loss)
        clip or inspect gradients according to the declared training spec
        opt.step(gradients)
        record loss, target tokens, gradient norm, throughput, and data mixture
        evaluate saved checkpoints on the frozen validation tasks
    return checkpoint selected by the declared task metric
```

Inputs are approved prompt-response records and a fixed template. Output is a new policy or
adapter. The important invariants are: only intended target tokens contribute to loss, no
held-out group enters training, and the deployed template is byte-for-byte compatible with
the training template. The main cost is forward and backward compute over training tokens.

SFT can teach format and imitation well. It is less direct when several outputs are valid but
one is preferable. It also cannot learn from a success-only score unless that score is first
converted into selected demonstrations.

### Direct preference optimization

DPO uses an offline data set of `(prompt, chosen, rejected)` triples. It compares how much the
trainable policy prefers each response relative to a fixed reference policy. For one pair:

```text
delta = beta * [
    log pi_theta(chosen | prompt) - log pi_ref(chosen | prompt)
  - log pi_theta(rejected | prompt) + log pi_ref(rejected | prompt)
]

L_DPO = -log sigmoid(delta)
```

The [DPO paper](https://arxiv.org/abs/2305.18290) derives this objective from a reward problem
with Kullback-Leibler (KL) divergence regularization. In operational terms, DPO is offline
preference optimization. It does not sample new rollouts inside the training loop and does
not train a separate scalar reward model. It has an RL derivation, but it is not online
reinforcement learning.

```text
algorithm DPO(preference pairs P, policy theta, fixed reference ref, beta):
    precompute or load ref log-probabilities for chosen and rejected responses
    repeat until the selected checkpoint or step budget:
        batch <- next pair batch from P
        logp_good <- sequence_logprob(theta, batch.chosen, response_tokens_only)
        logp_bad  <- sequence_logprob(theta, batch.rejected, response_tokens_only)
        ref_good  <- fixed_reference_logprob(batch.chosen)
        ref_bad   <- fixed_reference_logprob(batch.rejected)
        margin <- beta * ((logp_good - ref_good) - (logp_bad - ref_bad))
        loss <- mean(-log_sigmoid(margin))
        update theta from loss
        evaluate preference accuracy, response length, task quality, and regressions
    return checkpoint selected by the declared task metric
```

The fixed reference is an invariant. Chosen and rejected responses must use the same prompt
and template. Sequence log-probability normally sums response-token log-probabilities. Length
can therefore affect the objective and the data distribution. Evaluate concise and long
responses separately when length is not the intended preference.

DPO fails when preferences are inconsistent, when rejected responses are trivial, when the
pair distribution is far from the policy, or when annotators select fluent but false text.
It can also move the policy away from general capabilities. The reference term constrains
this movement, but it does not prove safety.

### Proximal policy optimization style RLHF

Proximal policy optimization (PPO) is one method for reinforcement learning from human
feedback (RLHF). The classic InstructGPT sequence has three learned stages:

1. SFT on human-written demonstrations.
2. A reward model trained on human rankings of several model outputs.
3. PPO updates to make the policy produce outputs with higher learned reward while limiting
   distance from a reference policy.

A common reward model gives one scalar `r_phi(x, y)` to a prompt and response. For a chosen
response `y_w` and rejected response `y_l`, a Bradley-Terry pair loss is:

```text
P_phi(y_w > y_l | x) = sigmoid(r_phi(x, y_w) - r_phi(x, y_l))
L_RM(phi) = -log P_phi(y_w > y_l | x)
```

One ranked list can produce several correlated pairs. Treating those pairs as independent can
overweight one prompt. The [InstructGPT implementation](https://arxiv.org/abs/2203.02155)
grouped comparisons from one prompt in the same training batch for this reason.

PPO stores the probability of each sampled token under the old policy. During updates it
uses the ratio between new and old probabilities. A clipped objective prevents a single batch
from causing an unrestricted policy change. A learned value model estimates expected return
and reduces policy-gradient variance. The original
[PPO paper](https://arxiv.org/abs/1707.06347) defines this repeated sample-then-optimize form.

For token action `a_t`, state `s_t`, estimated advantage `A_t`, and clip range `epsilon`:

```text
ratio_t(theta) = pi_theta(a_t | s_t) / pi_old(a_t | s_t)

L_clip(theta) = -mean minimum(
    ratio_t(theta) * A_t,
    clip(ratio_t(theta), 1-epsilon, 1+epsilon) * A_t
)
```

The sequence reward commonly combines reward-model output with a penalty for movement from
the frozen reference. The exact KL estimator and token allocation are implementation choices.

```text
algorithm PPO_RLHF(prompts X, actor theta, value psi, reward R, reference ref):
    repeat for a declared number of iterations:
        old_theta <- immutable snapshot of theta for this iteration
        rollouts <- sample responses and log old token probabilities
        scores <- R(prompt, response) minus declared reference-policy penalty
        advantages, returns <- estimate from scores and value(psi)
        repeat for K update passes over the rollout buffer:
            update theta with clipped policy loss and declared regularizers
            update psi with return-prediction loss
            stop the update passes if the declared divergence boundary is crossed
        evaluate task quality, reward, divergence, length, and regressions
    return the checkpoint accepted by the external task evaluation
```

The rollout buffer and old-policy snapshot are invariants for one iteration. Reusing much
older rollouts is off-policy training because another policy generated them. This changes the
estimator unless the method includes a declared correction.

An LLM PPO system can hold four logical models: actor, frozen reference, reward model, and
value model. Some systems share layers, quantize models, or place them on different workers.
Those changes reduce physical copies but do not remove the logical roles.

The reward model is a proxy for human judgment. It can be exploited. The
[reward-model overoptimization study](https://arxiv.org/abs/2210.10760) shows in a controlled
setting that more optimization against an imperfect proxy can eventually reduce a better
gold reward. KL penalties, update clipping, and early stopping control update size. They do
not make a wrong reward correct.

### Group relative policy optimization and verifiable rewards

RLVR describes the reward source, not one optimizer. A verifier can be a compiler, unit test,
symbolic checker, schema checker, exact-answer rule, or a controlled environment result.
PPO, GRPO, or another policy optimizer can use that reward.

[DeepSeekMath](https://arxiv.org/abs/2402.03300) introduced group relative policy
optimization (GRPO) as a PPO variant that removes the learned value model. For each prompt, it
samples a group of outputs. It uses the group's rewards to form relative advantages. A common
simplified form is:

```text
A_i = (reward_i - mean(reward_group)) / (std(reward_group) + epsilon)
```

The policy update uses these advantages with an old-policy probability ratio, clipping, and a
reference-policy KL term. Exact implementations differ. The group comparison is the central
mechanism.

```text
algorithm grouped RLVR(prompts X, actor theta, fixed reference ref, verifier V):
    repeat for a declared number of iterations:
        old_theta <- immutable snapshot of theta for this iteration
        for each prompt x in a batch:
            outputs <- sample G outputs from old_theta with logged seeds
            rewards <- [V(x, output) for output in outputs]
            if all rewards are equal:
                record a zero-signal group and exclude it from policy-gradient terms
            else:
                advantages <- normalize rewards within the group
                store tokens, old log-probabilities, rewards, and advantages
        for each update minibatch from stored rollouts:
            ratio <- exp(logp_theta - logged_old_logp)
            policy_term <- minimum(ratio * advantage,
                                   clip(ratio, 1-eps, 1+eps) * advantage)
            kl_term <- divergence(theta, ref) under the declared estimator
            update theta to maximize policy_term - beta * kl_term
        run frozen task and regression evaluations
        stop on the declared budget, plateau, or regression boundary
    return the accepted checkpoint and all verifier and rollout versions
```

The zero-signal condition is important. If all outputs pass or all outputs fail, a
group-relative method has no within-group ranking signal. Hard-task sampling, curriculum
design, and verifier resolution affect training efficiency.

[DeepSeek-R1](https://arxiv.org/abs/2501.12948) gives evidence that rule-based rewards and RL
can induce stronger reasoning in one model family. The same work also uses SFT, additional RL
stages, rejection sampling, and distillation to produce useful released models. The result does
not support the claim that a raw RL stage is sufficient for a polished assistant.

### Algorithm comparison

| Property | SFT | DPO | PPO-style RLHF | Grouped RLVR |
| --- | --- | --- | --- | --- |
| Required feedback | Target answer | Chosen and rejected pair | Comparisons used to train reward | Verifier score per rollout |
| New generation during optimization | No | No | Yes | Yes |
| Frozen reference | Optional for regularization | Required by objective | Common | Common |
| Learned reward model | No | No | Yes | No when reward is directly verifiable |
| Learned value model | No | No | Usually | No in GRPO |
| Dominant extra cost | Backward over target tokens | Two responses and reference scores | Rollouts plus several model roles | `G` rollouts per prompt |
| Main data failure | Bad targets or masks | Noisy or easy pairs | Reward-model bias | Verifier exploits or sparse reward |
| Natural stopping rule | Development-task plateau | Development-task plateau | Reward plateau plus external quality gate | Verified-task plateau plus regression gate |

Let `N` be training sequence tokens, `R` be generated rollout tokens, `G` be completions per
prompt, `P` be active model parameters, and `P_a` be trainable adapter parameters. Exact
transformer cost also contains attention terms that depend on sequence length. These variables
still show the main scaling drivers:

- SFT uses one policy forward and backward path over `N` tokens.
- DPO processes chosen and rejected sequences. It also needs reference log-probabilities, but
  a fixed reference allows those values to be cached.
- PPO adds generation over `R` tokens and passes through reward, reference, and value roles.
  It can train for several update passes on one rollout buffer.
- Grouped RLVR makes `R` grow approximately with `G`. It removes a value-model role in GRPO,
  but it does not remove rollout generation.
- Full Adam state scales with `P`. Adapter optimizer state scales with `P_a`, while frozen
  base storage and activation compute still scale with the base model.
- Rollout storage scales with generated tokens and logged fields such as old log-probability,
  reward, advantage, masks, and tool state.

Accumulate long sequence log-probabilities and reward statistics at adequate precision. Small
per-token errors can become large after a long sum. Record the exact epsilon for group reward
normalization and the exact KL estimator. These details can change training behavior.

None of these objectives guarantees generalization. Termination means the declared budget or
acceptance rule has stopped optimization. It does not mean the optimizer found a global
optimum.

## Evaluation is part of training design

### Use the most direct verifier available

Use this evidence order for each criterion:

1. Deterministic execution or exact source check.
2. A domain rubric with qualified, calibrated reviewers.
3. Pairwise human preference for subjective qualities.
4. A model judge for screening, triage, or a secondary metric.

Model judges are useful because they are fast and repeatable. They are not neutral.
[MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) found position, verbosity, and
self-enhancement biases even while model judgments often tracked human preferences.
[Length-Controlled AlpacaEval](https://arxiv.org/abs/2404.04475) showed that response length
can distort automatic preference evaluation and that explicit length control improved
agreement in its setting.

If a model judge must score a domain task, calibrate it against expert decisions. Measure
agreement by criterion and task class. Randomize answer order. Hide model identity. Give the
judge source documents when correctness requires them. Review disagreements. Never use the
same unvalidated judge as training reward and final proof of success.

### Match the metric to the product requirement

`pass@k` asks whether at least one of `k` samples succeeds. It is useful when a system can
generate several candidates and select one. The [Codex evaluation paper](https://arxiv.org/abs/2107.03374)
formalized this metric for generated code. With `n` sampled programs and `c` correct programs,
its unbiased estimator is `1 - C(n-c, k) / C(n, k)` when `n-c` is at least `k`, and 1
otherwise. `pass@1` is closer to a one-attempt product.

An all-pass task metric is stricter. A task passes only if every mandatory criterion passes.
Use it when one missed clause, file, citation, or safety condition makes the work unacceptable.
Also report per-criterion results. They show whether a system is close to complete or fails
many parts.

State how criteria are averaged. A micro-average gives every criterion equal weight, so tasks
with many criteria count more. A macro-average first averages within each task, then gives
every task equal weight. Report both when rubric counts vary substantially.

All-pass can be much lower than the average criterion pass rate. As an illustration, if a task
had ten independent criteria and each passed with probability 0.83, the all-pass probability
would be `0.83^10 = 15.5%`. Real criteria are not independent. The calculation explains the
multiplicative pressure but does not predict a benchmark score.

For each release candidate:

- run repeated samples when decoding is stochastic;
- report the number of tasks and attempts;
- compute paired confidence intervals where task outputs can be paired;
- show results by task family and difficulty;
- report regressions, not only aggregate gains;
- keep the base, SFT, and later-stage checkpoints in the same evaluation table;
- inspect changed answers, including improvements and regressions.

### What one legal-domain field result shows

The public Harvey Legal Agent Benchmark contains more than 1,200 tasks across 24 practice
areas and more than 75,000 expert-written rubric criteria, according to the
[benchmark introduction](https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark).
Each task has an instruction, a closed set of matter documents, and a required work product.
The [open benchmark repository](https://github.com/harveyai/harvey-labs) provides tasks and an
execution and evaluation harness.

A [public field report on domain post-training](https://www.trajectory.ai/field-notes/harvey-nemotron-3-ultra)
reports these held-out results for one large open-weight model:

| Reported measure | Base | Post-trained | Change |
| --- | ---: | ---: | ---: |
| Tasks that pass every rubric criterion | 0% | 5.8% | +5.8 percentage points |
| Individual rubric criteria passed | 52% | 83% | +31 percentage points |

The second change is a 59.6 percent relative gain. A relative gain from a zero-percent base is
undefined, so the all-pass change must stay in percentage points. The report also places the
post-trained result between two closed models on all-pass, states that training took less than
24 hours, and claims at least ten times lower price per token than selected closed models.

This is strong motivation for an experiment. It is not a reproducible training recipe. The
public report does not state the algorithm, training-example count, token count, data
provenance, hardware topology, GPU-hours, optimizer, batch shape, sequence length, training
cost, confidence intervals, or independent replication. It states that the tasks were held
out, but it does not give enough split detail to audit possible related-task leakage. The
correct conclusion is limited: a domain post-training run produced a large measured shift on
one strict benchmark. The report cannot tell another team what resources will reproduce it.

Four design lessons remain useful:

1. Measure a base checkpoint before training. The size of the possible gain depends on the
   starting policy.
2. Keep both all-pass and per-criterion metrics. A large criterion gain can coexist with a low
   rate of complete work products.
3. Keep the harness, data schema, and evaluation contract independent from one base model.
   A new checkpoint will still need tokenizer, template, parallelism, and regression checks.
4. Report GPU-hours, token count, and total cost with elapsed time. "Less than 24 hours" alone
   cannot distinguish an efficient small job from a large parallel job.

## Production and continual learning

### Prefer reviewed batches before online weight updates

A safe production loop collects traces, removes sensitive data, groups similar failures,
creates candidate examples, reviews them, and trains a new version offline. A release gate
then compares the candidate with the current version on frozen and recent tasks.

```text
production traces
    -> consent and retention filter
    -> failure taxonomy
    -> candidate SFT, preference, or verifier records
    -> human or program review
    -> versioned training batch
    -> offline candidate checkpoint
    -> frozen evaluation and small controlled deployment
    -> explicit promote or reject decision
```

This loop is continual in an operational sense, but the weight update remains periodic. It
has a clear data boundary and a rollback point.

Online or asynchronous RL is more complex. Rollouts can come from an older behavior policy
than the policy being updated. This is policy staleness. Importance ratios can correct some
distribution mismatch, but ratios over long token sequences can have high variance. Reward
definitions can also change while data is in flight. Recent work on
[learning from user interactions](https://arxiv.org/abs/2603.12273) and
[reinforcement learning through self-distillation](https://arxiv.org/abs/2601.20802) uses a
policy conditioned on later feedback as a token-level teacher. These are recent research
results. They do not establish a mature production standard. Treat this area as frontier
engineering, not a default recipe.

Continual updates also create these controls:

- a replay set for capabilities that must not be forgotten;
- a time-based holdout for new behavior;
- immutable reward and verifier versions for each run;
- trace consent, deletion, and access policy;
- model lineage and rapid rollback;
- a limit on how many updates can occur before a broad evaluation;
- monitoring for data drift, reward drift, and repeated user-specific patterns.

### Common failure modes

| Failure | Mechanism | Detection | Correction |
| --- | --- | --- | --- |
| Chat-template mismatch | Training tokens differ from deployment tokens | Decode fixed examples through both paths | Use one versioned template and exact special tokens |
| Prompt loss included by mistake | Model learns to reproduce user text | Inspect token-level masks | Apply completion-only or assistant-only loss |
| Random-row leakage | Related examples enter train and test | Compare source and semantic groups across splits | Split by matter, source, entity, template, or time |
| Synthetic error amplification | Teacher errors become targets | Source checks and expert audit samples | Reject or correct failed examples before training |
| Preference ambiguity | Random labels create conflicting gradients | Agreement and tie rate by rubric | Improve rubric, allow ties, adjudicate clear conflicts |
| Length bias | Longer output is selected as better | Quality at fixed length and length distributions | Balance pairs and use length-controlled evaluation |
| Reward hacking | Policy finds a high-score shortcut | External checks and adversarial rollouts | Repair the verifier and rebuild affected data |
| Catastrophic forgetting | Narrow updates damage prior behavior | Frozen general and safety suites | Adjust data mixture, update size, or method |
| RL reward sparsity | Most rollout groups have equal rewards | Zero-signal group rate | Change task sampling or increase verifier resolution |
| Distributed slowdown | Communication exceeds compute saved | Profiler timelines and tokens per second | Use fewer workers or change sharding and batch shape |
| Evaluation overfit | Training decisions consume the holdout | Access and query log for the holdout | Create a new untouched final test set |
| Adapter deployment mismatch | Wrong base or adapter revision is loaded | Artifact manifest and checksum test | Deploy one versioned model contract |

The correction column is not a request for silent fallback behavior. If a required check
fails, stop the run or release. Correct the primary path and repeat the controlled evaluation.

## A compact implementation plan

For an experienced ML engineer who is new to LLM post-training, this is the highest-value
first project:

1. Select an 8B to 14B instruct checkpoint whose license permits the intended use.
2. Define one narrow task, a development set, and a separate locked final test. Group them to
   prevent source leakage.
3. Build 200 to 500 approved message-format demonstrations.
4. Add provenance, review, and split fields to every record.
5. Run a 16-example overfit test with the deployment chat template.
6. Train a LoRA or QLoRA SFT adapter.
7. Compare base and SFT checkpoints on development data with deterministic checks and blinded
   review. Use the final test only for the selected release candidate.
8. Classify all failures. Add targeted examples and repeat once.
9. Create preference pairs only if experts can rank remaining failures more reliably than
   write targets.
10. Create an RLVR stage only if a strict verifier can score multiple useful attempts.

This project teaches the core post-training mechanics without the system cost of online RL.
It also produces the evaluation and data infrastructure that every later method needs.

## Evidence-backed insights

### INSIGHT-001: Post-training is a feedback taxonomy, not an RL synonym

**Claim.** The available feedback should select the training objective. Target responses imply
SFT. Comparisons imply preference optimization. Executable outcomes can support RLVR.

**Mechanism.** Each objective converts a different data relation into gradients. SFT increases
target-token probability. DPO increases a chosen-versus-rejected log-probability margin.
RL estimates policy gradients from sampled outcomes.

**Evidence.** Llama 3 used iterative SFT and DPO. Tulu 3 released SFT, DPO, and RLVR stages.
InstructGPT used SFT, a reward model, and PPO.

**Confidence.** High.

**Boundary.** The names do not specify data quality, model architecture, or implementation.

**Caveat.** Some papers use "post-training" more narrowly or classify offline preference
optimization within the broader RLHF family.

**Implication.** Define the feedback object before selecting the trainer.

**Follow-up.** Compare SFT, DPO, and RLVR on the same frozen task set and starting checkpoint.

### INSIGHT-002: Evaluation and data are the critical path

**Claim.** A post-training run cannot be interpreted without a frozen task distribution,
external acceptance criteria, and data lineage.

**Mechanism.** Training selects outputs that score well under its observed signal. If train
and test groups overlap, or if the grader rewards a shortcut, optimization improves the proxy
without proving deployment quality.

**Evidence.** Reward-model overoptimization shows proxy exploitation under stronger
optimization. Model-judge studies document systematic judgment biases. Major open recipes
use decontamination, mixture design, and several evaluation forms.

**Confidence.** High.

**Boundary.** Exact leakage and reward risks depend on the task and data-generation process.

**Caveat.** No finite evaluation proves correctness on all future inputs.

**Implication.** Build the evaluation and provenance system before a large training run.

**Follow-up.** Audit split-group overlap and judge-versus-expert disagreement for each task
family.

### INSIGHT-003: Adapter size is not total hardware demand

**Claim.** LoRA reduces trainable state. It does not reduce all memory in proportion to the
number of trainable parameters.

**Mechanism.** The frozen base still participates in each forward and backward pass.
Activations, temporary kernels, and communication buffers depend on sequence and batch shape.

**Evidence.** LoRA defines low-rank updates. QLoRA adds a quantized frozen base and reports one
65B-on-48-GB result. Official memory accounting separates weights, optimizer state,
gradients, activations, and temporary storage.

**Confidence.** High.

**Boundary.** Peak memory depends on the exact architecture, kernels, precision, and trainer.

**Caveat.** Raw 4-bit weight size is only a lower bound.

**Implication.** Size hardware with an end-to-end measured training step, not an adapter
parameter count.

**Follow-up.** Record peak memory and target tokens per second across the intended sequence
length distribution.

### INSIGHT-004: Human verification is a provenance process

**Claim.** "Human-verified" is meaningful only when it identifies the reviewer, rubric,
scope, independence, agreement, and adjudication process.

**Mechanism.** Humans supply observations through a task interface. Their qualifications,
instructions, available evidence, and incentives determine the noise and bias in that signal.

**Evidence.** InstructGPT documents screening, onboarding, instructions, limited duplicate
labels, measured agreement, and a non-representative reviewer population.

**Confidence.** High.

**Boundary.** A review can validate only the criteria and evidence that it covers.

**Caveat.** Expert agreement can remain low when the task itself is ambiguous.

**Implication.** Store human-review metadata as training data, not as separate administrative
text.

**Follow-up.** Measure agreement and adjudication rate by rubric criterion before scaling
annotation.

### INSIGHT-005: The fastest route is a small controlled loop

**Claim.** A small SFT adapter with a fixed evaluation usually gives more information per day
than an immediate large run or an RL stack.

**Mechanism.** It tests the full data, template, loss, checkpoint, inference, and evaluation
path with low compute. Error analysis then identifies whether more data, a different objective,
or a larger model is necessary.

**Evidence.** LIMA is a narrow example of high-quality small-data adaptation. Large open
recipes use repeated data and training rounds rather than one final run. The field result
shows that short elapsed time can produce a large benchmark change, but missing run details
prevent cost or recipe transfer.

**Confidence.** Medium-high.

**Boundary.** A weak base model or broad target policy can require more data and compute.

**Caveat.** A quick pilot is useful only if the held-out evaluation is representative.

**Implication.** Spend the first compute budget on a complete learning loop, not maximum model
size.

**Follow-up.** Plot task quality against approved examples, target tokens, and wall-clock time.

### INSIGHT-006: Verifiable reward changes the economics of RL

**Claim.** RL becomes easier to justify when reward comes from a high-precision program or
environment instead of a learned opinion model.

**Mechanism.** Each new rollout receives an immediate score without a separate reward-model
training stage. Grouped methods can compare several attempts and remove the learned critic.

**Evidence.** DeepSeekMath defines GRPO. DeepSeek-R1 reports reasoning gains from rule-based
rewards and RL in its studied setting.

**Confidence.** Medium-high for code and formal-answer tasks. Medium or low for open-ended
professional work.

**Boundary.** A verifier covers only encoded requirements.

**Caveat.** The policy can exploit any gap between the verifier and the real objective.

**Implication.** Invest in verifier coverage and adversarial tests before adding rollout
capacity.

**Follow-up.** Track false-pass rate, false-fail rate, zero-signal groups, and reward-versus-
expert disagreement.

## Sources

### Definitions, data, and open recipes

- [The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783)
- [Tulu 3: Pushing Frontiers in Open Language Model Post-Training](https://arxiv.org/abs/2411.15124)
- [LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206)
- [Training Language Models to Follow Instructions with Human Feedback](https://arxiv.org/abs/2203.02155)
- [Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073)
- [Open Source AI Definition 1.0](https://opensource.org/ai/open-source-ai-definition)

### Optimization methods

- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290)
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)
- [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948)
- [Aligning Language Models from User Interactions](https://arxiv.org/abs/2603.12273)
- [Reinforcement Learning via Self-Distillation](https://arxiv.org/abs/2601.20802)
- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)

### Systems and hardware

- [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054)
- [FlashAttention: Fast and Memory-Efficient Exact Attention](https://arxiv.org/abs/2205.14135)
- [PyTorch Fully Sharded Data Parallel documentation](https://docs.pytorch.org/docs/main/fsdp.html)
- [Transformers model memory anatomy](https://huggingface.co/docs/transformers/model_memory_anatomy)
- [Transformers optimization overview](https://huggingface.co/docs/transformers/main/optimization_overview)
- [TRL SFT Trainer documentation](https://huggingface.co/docs/trl/sft_trainer)
- [TRL DPO Trainer documentation](https://huggingface.co/docs/trl/dpo_trainer)
- [TRL GRPO Trainer documentation](https://huggingface.co/docs/trl/grpo_trainer)
- [PEFT documentation](https://huggingface.co/docs/peft/index)
- [Accelerate documentation](https://huggingface.co/docs/accelerate/index)
- [bitsandbytes documentation](https://huggingface.co/docs/bitsandbytes/index)
- [OpenRLHF](https://github.com/OpenRLHF/OpenRLHF)
- [verl documentation](https://verl.readthedocs.io/en/latest/)

### Evaluation and field evidence

- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)
- [Length-Controlled AlpacaEval](https://arxiv.org/abs/2404.04475)
- [Scaling Laws for Reward Model Overoptimization](https://arxiv.org/abs/2210.10760)
- [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374)
- [Harvey Legal Agent Benchmark introduction](https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark)
- [Harvey Legal Agent Benchmark repository](https://github.com/harveyai/harvey-labs)
- [Public legal-domain post-training field report](https://www.trajectory.ai/field-notes/harvey-nemotron-3-ultra)
