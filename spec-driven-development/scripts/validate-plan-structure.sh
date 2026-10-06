#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <plan-path>"
    echo "Validates the ## Execution Status section of a plan file."
    echo "Requires at least one phase-N stage (implement/validate/commit-pr), not only post:/finalize:."
    echo "Canonical phase heading format: ## Phase 1: Title"
    echo ""
    echo "Exit codes:"
    echo "  0: well-formed"
    echo "  1: malformed (error details on stderr)"
    exit 1
}

print_execution_status_example() {
    cat >&2 <<'EOF'
  Example for a two-phase plan:

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
EOF
}

if [ $# -lt 1 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
fi

PLAN_PATH="$1"

if [ ! -f "$PLAN_PATH" ]; then
    echo -e "${RED}ERROR: Plan file not found: $PLAN_PATH${NC}" >&2
    exit 1
fi

# Count how many ## Execution Status sections exist (skip fenced code blocks)
section_count=$(awk '
    /^```/ {in_fence=!in_fence; next}
    !in_fence && /^## Execution Status/ {count++}
    END {print count+0}
' "$PLAN_PATH")

if [ "$section_count" -eq 0 ]; then
    echo -e "${RED}ERROR: No '## Execution Status' section found in $PLAN_PATH${NC}" >&2
    echo "  Add a '## Execution Status' section with stage checkboxes to the plan." >&2
    print_execution_status_example
    exit 1
fi

if [ "$section_count" -gt 1 ]; then
    echo -e "${RED}ERROR: Multiple '## Execution Status' sections found in $PLAN_PATH (found $section_count)${NC}" >&2
    echo "  There must be exactly one '## Execution Status' section." >&2
    exit 1
fi

# Extract all lines in the Execution Status section (skip fenced code blocks)
section_lines=$(awk '
    /^```/ {in_fence=!in_fence; next}
    !in_fence && /^## Execution Status/ {in_section=1; next}
    in_section && /^## / {exit}
    in_section {print}
' "$PLAN_PATH")

# Filter to non-empty, non-comment lines
checklist_lines=$(echo "$section_lines" | grep -v '^\s*$' | grep -v '^\s*<!--' | grep -v '^\s*-->' || true)

if [ -z "$checklist_lines" ]; then
    echo -e "${RED}ERROR: Execution Status section is empty (no checklist items) in $PLAN_PATH${NC}" >&2
    print_execution_status_example
    exit 1
fi

# Validate each line matches the expected pattern
line_num=0
errors=0
seen_keys=()

while IFS= read -r line; do
    line_num=$((line_num + 1))

    # Each line must match: - [ ] key or - [x] key
    if ! echo "$line" | grep -Eq '^- \[[ x]\] (phase-[0-9A-Za-z]+(\.[0-9]+)*|post|finalize): [a-z-]+$'; then
        echo -e "${RED}ERROR: Malformed line $line_num in Execution Status: '$line'${NC}" >&2
        echo "  Expected format: '- [ ] phase-N: step' or '- [ ] post: step' or '- [ ] finalize: step'" >&2
        echo "  Canonical phase rows are: '- [ ] phase-1: implement', '- [ ] phase-1: validate', '- [ ] phase-1: commit-pr'" >&2
        errors=$((errors + 1))
        continue
    fi

    # Extract the stage key (everything after "- [ ] " or "- [x] ")
    stage_key="${line:6}"

    # Check for duplicates
    for seen in "${seen_keys[@]+${seen_keys[@]}}"; do
        if [ "$seen" = "$stage_key" ]; then
            echo -e "${RED}ERROR: Duplicate stage key: '$stage_key'${NC}" >&2
            errors=$((errors + 1))
        fi
    done
    seen_keys+=("$stage_key")
done <<< "$checklist_lines"

if [ "$errors" -gt 0 ]; then
    exit 1
fi

# Execution Status must list implementation phases, not only post: / finalize:.
# Otherwise the orchestrator finds no phase work and incorrectly treats the plan as complete.
if ! echo "$checklist_lines" | grep -qE '^- \[[ x]\] phase-[0-9A-Za-z]+(\.[0-9]+)*: '; then
    echo -e "${RED}ERROR: Execution Status must include at least one phase-N stage${NC} (e.g. phase-1: implement, phase-1: validate, phase-1: commit-pr) in $PLAN_PATH" >&2
    echo "  post: and finalize: rows alone are invalid; add phase-1 ... phase-N blocks before post: review-and-fix." >&2
    exit 1
fi

# Extract phase numbers from the plan headings
plan_phases=$(python3 - "$PLAN_PATH" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text()

patterns = [
    re.compile(r"^\s{0,3}#{1,6}\s+(?:\*\*)?Phase\s+([0-9]+(?:\.[0-9]+)*|[A-Za-z])(?:\*\*)?(?:\s*[:\-]|\s*$)", re.MULTILINE),
    re.compile(r"^\s*(?:\*\*|__)?Phase\s+([0-9]+(?:\.[0-9]+)*|[A-Za-z])(?:\*\*)?(?:\s*[:\-]|\s*$)", re.MULTILINE),
]

seen = []
for pattern in patterns:
    for match in pattern.findall(text):
        if match not in seen:
            seen.append(match)

print("\n".join(seen))
PY
)

# Extract phase numbers from stage keys in the Execution Status section
# Portable across BSD (macOS) and GNU sed; avoids grep -P which BSD grep lacks.
status_phases=$(echo "$checklist_lines" | sed -nE 's/^- \[.\] phase-([0-9A-Za-z]+(\.[0-9]+)*):.*/\1/p' | sort -u)

# Check that every plan phase has corresponding stage keys
while IFS= read -r phase; do
    [ -z "$phase" ] && continue
    if ! echo "$checklist_lines" | grep -q "^- \[.\] phase-${phase}: "; then
        echo -e "${RED}ERROR: Phase $phase found in plan headings but missing from Execution Status section${NC}" >&2
        echo "  Add exactly these rows for that phase: phase-${phase}: implement, phase-${phase}: validate, phase-${phase}: commit-pr." >&2
        errors=$((errors + 1))
    fi
done <<< "$plan_phases"

# Check that every status phase has a corresponding plan heading
while IFS= read -r phase; do
    [ -z "$phase" ] && continue
    if ! echo "$plan_phases" | grep -qx "$phase"; then
        echo -e "${RED}ERROR: Phase $phase found in Execution Status but not in plan headings${NC}" >&2
        echo "  Add a machine-readable plan heading such as '## Phase $phase: Title', or remove the phase-${phase} rows if that phase does not exist." >&2
        echo "  Headings with Unicode dash separators (em or en dash) are not recognized; use ':' or '-' after the phase number." >&2
        errors=$((errors + 1))
    fi
done <<< "$status_phases"

# Check canonical post and finalize keys are present
canonical_keys=(
    "post: review-and-fix"
    "post: review-validate"
    "post: review-commit-pr"
    "post: security-review"
    "post: security-validate"
    "post: security-commit-pr"
    "finalize: pr-description"
    "finalize: issue-update"
)

for key in "${canonical_keys[@]}"; do
    if ! echo "$checklist_lines" | grep -qF "$key"; then
        echo -e "${RED}ERROR: Missing canonical stage key: '$key'${NC}" >&2
        errors=$((errors + 1))
    fi
done

if [ "$errors" -gt 0 ]; then
    exit 1
fi

# Non-fatal plan-size guidance. The plan is the review surface: a wrong line in a
# plan cascades into many wrong lines of code, so oversized plans and pasted full
# code blocks are flagged. This is advisory only and never gates: a large
# multi-phase feature can legitimately exceed the threshold.
PLAN_WARN_LINES="${PLAN_WARN_LINES:-400}"
PLAN_WARN_BLOCK_LINES="${PLAN_WARN_BLOCK_LINES:-40}"

nonblank_lines=$(grep -cve '^[[:space:]]*$' "$PLAN_PATH" || true)
max_block=$(awk '
    /^```/ {
        if (in_fence) { if (cur > max) max = cur; in_fence=0 }
        else { in_fence=1; cur=0 }
        next
    }
    in_fence { cur++ }
    END { print max+0 }
' "$PLAN_PATH")

if [ "${nonblank_lines:-0}" -gt "$PLAN_WARN_LINES" ]; then
    echo -e "${YELLOW}WARNING: plan has ${nonblank_lines} non-blank lines (> ${PLAN_WARN_LINES}). The plan is the review surface: move rationale to the research doc and reference code by file:line instead of pasting it.${NC}" >&2
fi
if [ "${max_block:-0}" -gt "$PLAN_WARN_BLOCK_LINES" ]; then
    echo -e "${YELLOW}WARNING: a fenced code block has ${max_block} lines (> ${PLAN_WARN_BLOCK_LINES}). Prefer interface signatures, a small diff, or pseudocode; do not paste full function bodies (they drift from the codebase).${NC}" >&2
fi

exit 0
