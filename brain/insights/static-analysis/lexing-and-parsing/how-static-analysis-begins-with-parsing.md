---
type: insight
title: "How Static Analysis Begins With Parsing"
slug: how-static-analysis-begins-with-parsing
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[data-flow-engines-are-fixed-point-machines]]"
---

# How Static Analysis Begins With Parsing

Static analysis starts by turning a byte sequence into a structured, source-mapped
representation. The familiar AST is the result of several decisions: how characters become
tokens, how tokens are grouped by a grammar, which delimiters and comments are retained, how
incomplete code is recovered, and whether the tree can be updated incrementally. Those
decisions are semantic prerequisites for every later fact. A rule cannot reliably find a call,
an import, or a branch that the frontend failed to represent, and a rule cannot produce a useful
diagnostic if the tree has lost the source span that explains it.

## The frontend pipeline

The useful mental model is a pipeline with a deliberately lossy boundary between syntax and
semantics:

```mermaid
flowchart LR
  Bytes[Source bytes] --> Lex[Lexer / tokenizer]
  Lex --> Tokens[Tokens + trivia + spans]
  Tokens --> Parse[Parser + grammar]
  Parse --> CST[Concrete syntax tree]
  CST --> AST[Typed or simplified AST]
  AST --> Bind[Names, types, imports, control flow]
  Bind --> Facts[Static-analysis facts]
```

The stages answer different questions:

| Stage | Input and output | What it knows | Typical failure mode |
| --- | --- | --- | --- |
| Lexing | Characters -> tokens | Delimiters, keywords, literals, comments, spans | A context-sensitive token is split incorrectly. |
| Parsing | Tokens -> CST/AST | Nesting, precedence, declarations, statement structure | A grammar choice attaches a node to the wrong parent. |
| AST lowering | CST -> analysis AST/IR | A smaller semantic shape for later passes | Trivia, macro origins, or recovery information is discarded too early. |
| Binding | AST + project model -> symbols/types | What each name and call refers to | Missing build configuration creates unresolved symbols. |

An AST is therefore not the source code itself. It is a representation selected for a purpose.
An IDE often needs a lossless concrete syntax tree (CST) so it can preserve comments and
whitespace. A compiler optimizer often wants a smaller IR where desugared control flow and
types are explicit. A linter may need both: the CST for an exact fix and the typed AST for a
semantic rule.

## Lexing: making the stream analyzable

A lexer recognizes the longest valid token at the current offset, records its kind and span,
and advances. It normally treats whitespace and comments as trivia rather than semantic
tokens, but a tooling frontend often retains them because formatting and refactoring must
round-trip the original file.

For example:

```text
let total = price + tax * 1.2;
```

can become:

```text
LET("let",          [0, 3))
IDENT("total",      [4, 9))
EQUAL("=",          [10, 11))
IDENT("price",      [12, 17))
PLUS("+",           [18, 19))
IDENT("tax",        [20, 23))
STAR("*",           [24, 25))
FLOAT("1.2",        [26, 29))
SEMICOLON(";",     [29, 30))
```

The lexer must also decide where lexical structure ends and grammar begins. Template strings,
nested interpolation, Python indentation, C preprocessor directives, Rust raw strings, and
JavaScript regular-expression literals are examples where a regular-expression-only lexer is
not enough.

```text
tokenize(source):
  offset = 0
  tokens = []

  while offset < source.length:
    if starts_trivia(source, offset):
      trivia, offset = scan_trivia(source, offset)
      attach_as_leading_trivia(tokens, trivia)
      continue

    token = scan_longest_valid_token(source, offset)
    if token is none:
      tokens.append(Token(ERROR, source[offset], span(offset, offset + 1)))
      offset += 1
      continue

    tokens.append(token)
    offset = token.end

  tokens.append(Token(EOF, "", span(offset, offset)))
  return tokens
```

The `ERROR` branch is not a license to silently continue. It creates a stable place for the
parser and diagnostics to record an unsupported or malformed character. A production frontend
also needs encoding policy, line/column mapping, Unicode identifier rules, source-file version,
and a way to map generated or macro-expanded tokens back to the origin.

## Parsing: grouping tokens by a grammar

Parsing recognizes a sequence of tokens as a derivation in a grammar. It establishes the
relationships that text searches cannot: `tax * 1.2` is the right child of `price + ...`, and a
`return` belongs to the nearest function body rather than to a surrounding block.

For a small expression grammar:

```text
expression ::= primary (("+" | "-") primary)*
primary    ::= IDENT | NUMBER | "(" expression ")"
```

the parser constructs a tree while it consumes tokens. Real parsers use recursive descent,
Pratt precedence parsing, LR/LALR tables, PEGs, GLR, or combinations of those techniques.
The algorithm is less important to a rule author than the contract it produces: node kinds,
child order, source ranges, recovery nodes, and whether the representation is stable across
edits.

```text
parse_expression(min_precedence):
  left = parse_prefix()

  while is_binary_operator(peek()) and precedence(peek()) >= min_precedence:
    operator = consume()
    right = parse_expression(precedence(operator) + associativity_delta(operator))
    left = BinaryExpression(left, operator, right, span(left.start, right.end))

  return left
```

For the example above, a precedence-aware parser produces a shape equivalent to:

```text
BinaryExpression(PLUS)
├── Identifier("price")
└── BinaryExpression(STAR)
    ├── Identifier("tax")
    └── Number("1.2")
```

The parser should not resolve whether `price` is a local, an imported constant, or a field on
an object. That is name binding. Keeping syntax and semantics separate makes parsing reusable
for incomplete files, multiple project configurations, and editor operations.

## CST, AST, and lowering are different products

The terms are often used interchangeably, but an analysis engine should name the distinction:

| Representation | Preserves | Omits or normalizes | Good for |
| --- | --- | --- | --- |
| Token stream | Exact lexical order, spans, trivia if retained | Nesting and precedence | Formatting, lexical rules, recovery diagnostics |
| CST | Every grammar node, delimiters, often trivia and errors | Little or no semantic meaning | Refactoring, syntax queries, editor features |
| AST | Semantic structure such as `If`, `Call`, `BinaryOp` | Punctuation, redundant grammar productions | Lint rules, binding, CFG construction |
| Typed AST / HIR | Resolved symbols, inferred types, desugared constructs | Some surface syntax | Type checks, API rules, semantic navigation |
| IR / MIR | Explicit control flow and machine-relevant operations | Most source presentation | Data flow, borrow checking, optimization |

A clean engine can keep a source-preserving tree private while exposing a smaller, stable fact
surface to rules. Lowering is where it should make decisions such as turning `for item in xs`
into an iterator loop or representing `&&` as two conditional edges. Lowering too early can
make diagnostics hard to map back; lowering too late can force every analysis to understand
surface-language sugar.

## Three production frontend designs

### Tree-sitter: incremental concrete syntax trees

[Tree-sitter describes itself as both a parser generator and an incremental parsing library](https://tree-sitter.github.io/tree-sitter/).
Its goal is to parse on every keystroke, return a concrete syntax tree, and remain useful when
the source contains errors. A grammar is written as a set of rules, and the generated parser
produces named nodes that can be queried:

```javascript
module.exports = grammar({
  name: "mini",

  rules: {
    source_file: ($) => repeat($._statement),
    _statement: ($) => seq($.identifier, "=", $.expression, ";"),
    expression: ($) => choice($.identifier, $.number, $.binary_expression),
    binary_expression: ($) => prec.left(1, seq($.expression, "+", $.expression)),
    identifier: () => /[a-zA-Z_][a-zA-Z0-9_]*/,
    number: () => /[0-9]+/
  }
});
```

An analysis can then query a tree without reparsing or evaluating the program:

```scheme
(call_expression
  function: (identifier) @callee
  arguments: (arguments) @args)
```

Tree-sitter is a CST, not a typed semantic model. It is intentionally useful before name
resolution exists. Its incremental interface means an edit can reuse unaffected subtrees, but
the analysis still has to invalidate facts whose spans, parent structure, or binding context
changed. The parser's error representation is explicit: unrecognized text becomes an `ERROR`
node, while recoverable inserted tokens appear as `MISSING` nodes. A rule that ignores those
nodes may accidentally claim certainty about code that was never successfully parsed.

### Roslyn: full-fidelity immutable syntax trees

[Roslyn's syntax model](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/work-with-syntax)
is designed for compilation, code analysis, refactoring, and code generation. It preserves
tokens, trivia, preprocessor directives, exact text, and source spans in an immutable tree.
The API exposes strongly typed node classes and `SyntaxKind` values:

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

var tree = CSharpSyntaxTree.ParseText("var total = price + tax * 1.2;");
var root = tree.GetRoot();
var binary = root.DescendantNodes()
    .OfType<BinaryExpressionSyntax>()
    .Single(node => node.IsKind(SyntaxKind.AddExpression));

Console.WriteLine(binary.Left);           // price
Console.WriteLine(binary.Right.Kind());   // MultiplyExpression
```

Roslyn's full fidelity is useful when a rule must offer an exact fix rather than regenerate a
whole file. Its error recovery inserts missing tokens with an empty span or attaches skipped
tokens as `SkippedTokensTrivia`. The tree remains round-trippable, so a refactoring can operate
on malformed code while still preserving what the user typed. Semantic models are separate:
the syntax tree says that a name is an invocation or identifier; binding says which method it
denotes.

### rust-analyzer: events, rowan trees, and resilient IDE semantics

[rust-analyzer's syntax architecture](https://rust-analyzer.github.io/book/contributing/architecture.html)
separates a hand-written recursive-descent parser from the tree representation. The parser
emits `start node` and `finish node` events; a `TreeSink` turns those events into a `rowan`
green tree, red views, and a typed Rust AST. The parser and tree do not depend on semantic
analysis.

```text
source text
   -> TokenSource
   -> parser events: Start(Fn), Token(fn), ..., Finish
   -> TreeSink
   -> rowan GreenNode + SyntaxNode view
   -> typed AST wrappers
   -> HIR/name resolution/type inference
```

The architecture has two properties that matter to analysis. First, parsing returns a tree and
an error list rather than failing the entire request; broken editor input is normal state. The
tree is lossless and resilient, so comments, whitespace, and unknown fragments remain
available. Second, green trees make incremental reparsing cheap: rust-analyzer can patch a
small region and reuse the rest. Semantic queries are then invalidated by the incremental
database rather than by reparsing every file.

## Error recovery is part of the analysis contract

An interactive tool must parse text that is temporarily invalid: a user may have typed `if (`
or deleted a closing brace. A batch compiler may prefer a precise failure. Static analysis
frontends often need both a partial tree and an explicit error status.

| Recovery strategy | Mechanism | Benefit | Risk for analysis |
| --- | --- | --- | --- |
| Panic-mode | Skip tokens until a synchronizing token such as `;` or `}` | Simple and terminates | A large skipped region hides declarations or creates a false gap. |
| Phrase-level repair | Insert, delete, or replace a small token | Preserves more structure | The invented token can create a plausible but false AST. |
| Error nodes | Keep unexpected text under `ERROR` | Downstream passes can remain total | Rules must treat error subtrees as uncertain. |
| Missing tokens | Represent an expected token with zero width | Parent structure survives incomplete input | A zero-width node must not be reported as source text. |
| GLR / costed recovery | Explore repairs and select a low-cost parse | Useful for ambiguous or damaged input | More states and more opportunities for divergent trees. |

The safe contract is not “recovery makes invalid code valid.” It is:

1. Preserve the original span and token text.
2. Mark inserted, skipped, and ambiguous material.
3. Keep recovery diagnostics separate from semantic diagnostics.
4. Propagate an `unknown` or `incomplete` status when a rule depends on damaged structure.
5. Test the same rule on complete, incomplete, and wrongly recovered fixtures.

This prevents a common failure: a security rule sees a recovered call node and reports “safe”
because a malformed argument was dropped. The correct result is often “not evaluated” or
“uncertain,” not a clean bill of health.

## Why parser choice changes downstream precision

The parser is an analysis boundary, not a replaceable implementation detail.

| Parser choice | Downstream consequence |
| --- | --- |
| Lossy AST only | Fast traversal, but fixes and provenance cannot reconstruct comments, macros, or exact tokens. |
| Lossless CST | Better edits and evidence, at the cost of larger trees and more syntax cases. |
| Error-tolerant parser | IDE and incremental analysis can continue, but every rule needs uncertainty handling. |
| Grammar with explicit precedence | Correct expression and control-flow structure; a flat token search will miss nesting. |
| Incremental parser | Lower edit latency, but caches need dependency-aware invalidation. |
| Compiler frontend with types | Strong semantic facts, but build configuration and generated code become prerequisites. |
| Generic multi-language parser | Broad coverage, but dialects, macros, and language-specific semantics may be shallow. |

Consider a policy that forbids a call to `exec` when a request value reaches it. A token search
can find `exec`, but it cannot tell whether the name is shadowed, whether the call is inside a
comment or string, whether a macro expands to the call, or whether `sanitize(input)` changes
the relevant value. An AST can establish the call and argument structure. A typed AST and data
flow facts are needed for the rest. Every later conclusion inherits the parser's coverage and
source mapping.

## Practical frontend checklist

Before building rules on a parser, verify:

| Question | Fixture that answers it |
| --- | --- |
| Are precedence and associativity correct? | Nested arithmetic and chained comparisons. |
| Are spans byte-, character-, or line-based? | Unicode identifiers and diagnostics at columns. |
| Are comments and strings distinguishable? | A forbidden API name in a comment and a string. |
| Does recovery preserve surrounding declarations? | Missing `)`, `}`, comma, and semicolon cases. |
| Are macro/preprocessor origins retained? | A call generated from a macro and a call in an inactive branch. |
| Is incremental reuse sound? | Edit one function and assert unrelated facts remain unchanged. |
| Can the semantic layer represent “unknown”? | Unresolved imports, incomplete syntax, and generated files. |

The strongest architecture usually keeps three layers: a source-preserving syntax tree for
spans and edits, a semantic lowering for names/types/control flow, and a fact API that exposes
only stable, provenance-carrying results. Parsing is where static analysis begins, but it is
not where the analyzer's confidence begins. Confidence starts when the engine can state what
the frontend did and did not represent.

## Sources

- [Tree-sitter introduction](https://tree-sitter.github.io/tree-sitter/)
- [Tree-sitter error and missing nodes](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html)
- [Tree-sitter underlying research](https://tree-sitter.github.io/tree-sitter/#underlying-research)
- [Roslyn syntax trees and error recovery](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/work-with-syntax)
- [rust-analyzer syntax trees](https://rust-analyzer.github.io/book/contributing/syntax.html)
- [rust-analyzer architecture and parser invariants](https://rust-analyzer.github.io/book/contributing/architecture.html)
- [ANTLR error strategy API](https://www.antlr.org/api/Java/org/antlr/v4/runtime/ANTLRErrorStrategy.html)
