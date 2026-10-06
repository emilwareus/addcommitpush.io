#!/usr/bin/env bash

set -euo pipefail

# Extract and validate the "## Open Questions" section from a research markdown file.
# Outputs the section content (without the heading) or empty string if not found.
extract_open_questions() {
    local research_path="$1"
    python3 - "$research_path" <<'PY'
import pathlib
import re
import sys

def fail(message: str) -> None:
    print(f"ERROR: invalid ## Open Questions format: {message}", file=sys.stderr)
    sys.exit(2)

path = pathlib.Path(sys.argv[1])
if not path.exists():
    sys.exit(0)

text = path.read_text()
match = re.search(r'^## Open Questions\s*$(.*?)(?=^## |\Z)', text, re.MULTILINE | re.DOTALL)
if not match:
    sys.exit(0)

content = match.group(1).strip()
if not content:
    sys.exit(0)

empty_markers = {
    "none",
    "none.",
    "n/a",
    "n/a.",
    "no open questions",
    "no open questions.",
    "no open questions from research",
    "no open questions from research.",
    "no unresolved questions",
    "no unresolved questions.",
}
if re.sub(r"\s+", " ", content).strip().lower() in empty_markers:
    sys.exit(0)

question_matches = list(re.finditer(r'(?m)^Q([1-9][0-9]*)\.\s+(.+?)\s*$', content))
if not question_matches:
    first_para = content.split("\n\n", 1)[0].strip()
    first_para_norm = re.sub(r"\s+", " ", first_para).strip().lower()
    if first_para_norm in empty_markers:
        sys.exit(0)
    fail("expected questions to start with 'Q1. ', 'Q2. ', etc.")

if content[:question_matches[0].start()].strip():
    fail("remove preamble text before Q1")

for index, question_match in enumerate(question_matches, start=1):
    question_number = int(question_match.group(1))
    title = question_match.group(2).strip()
    if question_number != index:
        fail(f"expected Q{index}, found Q{question_number}")
    if "?" not in title:
        fail(f"Q{index} must be written as a standalone question")

    block_start = question_match.start()
    block_end = question_matches[index].start() if index < len(question_matches) else len(content)
    block = content[block_start:block_end].strip()

    if not re.search(r'(?m)^Context:\s+\S', block):
        fail(f"Q{index} is missing 'Context:'")
    if not re.search(r'(?m)^Research checked:\s+\S', block):
        fail(f"Q{index} is missing 'Research checked:'")
    if not re.search(r'(?m)^Why this requires user input:\s+\S', block):
        fail(f"Q{index} is missing 'Why this requires user input:'")

    default_match = re.search(r'(?m)^Default if unanswered:\s+([a-z])\s*$', block)
    if not default_match:
        fail(f"Q{index} is missing 'Default if unanswered: <letter>'")
    default_letter = default_match.group(1)

    options_heading = re.search(r'(?m)^Options:\s*$', block)
    if not options_heading:
        fail(f"Q{index} is missing 'Options:'")

    options_text = block[options_heading.end():]
    option_matches = list(re.finditer(r'(?m)^([a-z])\.\s+(.+?)\s*$', options_text))
    if len(option_matches) < 2:
        fail(f"Q{index} must have at least two options")

    # Only enforce the "single-line entries" rule between the first option and
    # the end of the last option line. Trailing prose after the last option
    # (separators, rationale, a Resolution: note) is allowed. Continuation lines
    # BETWEEN options still fail because those are genuine formatting bugs.
    options_block_end = option_matches[-1].end()
    options_block = options_text[option_matches[0].start():options_block_end]
    non_option_lines = [
        line for line in options_block.splitlines()
        if line.strip() and not re.match(r'^[a-z]\.\s+', line)
    ]
    if non_option_lines:
        fail(f"Q{index} options must be single-line entries labeled a., b., c.")

    letters = [option_match.group(1) for option_match in option_matches]
    expected_letters = [chr(ord("a") + offset) for offset in range(len(letters))]
    if letters != expected_letters:
        fail(f"Q{index} options must be sequential from a")

    if default_letter not in letters:
        fail(f"Q{index} default option '{default_letter}' is not listed")

    recommended = [
        option_match.group(1)
        for option_match in option_matches
        if "[recommended]" in option_match.group(2).lower()
    ]
    if len(recommended) != 1:
        fail(f"Q{index} must have exactly one [Recommended] option")
    if recommended[0] != default_letter:
        fail(f"Q{index} default must match the [Recommended] option")

print(content)
PY
}

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

REQUIRE_ANSWERS=false
RESEARCH_PATH=""

usage() {
    cat >&2 <<'EOF'
Usage: validate-research-structure.sh <research-path> [--require-answers]

Validates the "## Open Questions" section of a research document (or a draft
plan). It is the peer of validate-plan-structure.sh, which validates a plan's
"## Execution Status" section.

Canonical question format (enforced):

  Q1. <a standalone question ending in '?'>
  Answer: <letter>            (optional; required only with --require-answers)
  Context: <...>
  Research checked: <...>
  Why this requires user input: <...>
  Default if unanswered: <letter>
  Options:
  a. [Recommended] <...>
  b. <...>

Structural rules (enforced by extract_open_questions):
  - Questions numbered sequentially from Q1; no preamble text before Q1.
  - Each question has Context / Research checked / Why this requires user input.
  - Options are single-line, sequential from a., with exactly one [Recommended].
  - "Default if unanswered" names a listed option and matches the [Recommended] one.
  - An empty section or a "None" / "N/A" marker is valid (no open questions).

Answer rules (answers live IN the research doc):
  - Any "Answer:" / "Selected:" / "Resolved:" line must name an option letter
    that is listed for that question (an answer MAY override the recommended one).
  - With --require-answers, every question MUST carry an Answer line.

Exit codes:
  0  well-formed (and, with --require-answers, every question answered)
  1  malformed, or unanswered questions when --require-answers is set
EOF
    exit 1
}

while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --require-answers)
            REQUIRE_ANSWERS=true
            shift
            ;;
        -*)
            echo -e "${RED}ERROR: unknown flag: $1${NC}" >&2
            usage
            ;;
        *)
            if [ -n "$RESEARCH_PATH" ]; then
                echo -e "${RED}ERROR: unexpected extra argument: $1${NC}" >&2
                usage
            fi
            RESEARCH_PATH="$1"
            shift
            ;;
    esac
done

if [ -z "$RESEARCH_PATH" ]; then
    usage
fi

if [ ! -f "$RESEARCH_PATH" ]; then
    echo -e "${RED}ERROR: Research file not found: $RESEARCH_PATH${NC}" >&2
    exit 1
fi

# Step 1: structural validation of the "## Open Questions" section.
# extract_open_questions prints the section to stdout on
# success and exits non-zero (with a specific reason on stderr) when malformed.
oq_status=0
extract_open_questions "$RESEARCH_PATH" >/dev/null || oq_status=$?
if [ "$oq_status" -ne 0 ]; then
    echo -e "${RED}ERROR: malformed '## Open Questions' section in $RESEARCH_PATH${NC}" >&2
    exit 1
fi

# Step 2: answer validation (answers are recorded inline in the research doc).
python3 - "$RESEARCH_PATH" "$REQUIRE_ANSWERS" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
require_answers = sys.argv[2] == "true"
text = path.read_text()

section = re.search(r'^## Open Questions\s*$(.*?)(?=^## |\Z)', text, re.MULTILINE | re.DOTALL)
if not section:
    print("OK: no '## Open Questions' section (nothing to answer)")
    sys.exit(0)

content = section.group(1).strip()
questions = list(re.finditer(r'(?m)^Q([1-9][0-9]*)\.\s+.+?\s*$', content))
if not questions:
    print("OK: '## Open Questions' has no questions (None / N/A)")
    sys.exit(0)

errors = []
answered = 0
total = len(questions)

for index, question in enumerate(questions):
    number = question.group(1)
    block_start = question.start()
    block_end = questions[index + 1].start() if index + 1 < len(questions) else len(content)
    block = content[block_start:block_end]

    options_heading = re.search(r'(?m)^Options:\s*$', block)
    letters = []
    if options_heading:
        for option in re.finditer(r'(?m)^([a-z])\.\s+', block[options_heading.end():]):
            letters.append(option.group(1))

    answer = re.search(r'(?m)^(?:Answer|Selected|Resolved):\s+([a-z])\b', block)
    if answer:
        answered += 1
        if answer.group(1) not in letters:
            errors.append(
                f"Q{number}: answer '{answer.group(1)}' is not a listed option "
                f"({', '.join(letters) or 'none found'})"
            )
    elif require_answers:
        errors.append(f"Q{number}: missing 'Answer: <letter>' (required by --require-answers)")

for error in errors:
    print(f"ERROR: {error}", file=sys.stderr)

if errors:
    sys.exit(1)

print(f"OK: {answered}/{total} open questions answered")
PY
answer_status=$?

if [ "$answer_status" -ne 0 ]; then
    exit 1
fi

echo -e "${GREEN}validate-research-structure: $RESEARCH_PATH is well-formed${NC}" >&2
exit 0
