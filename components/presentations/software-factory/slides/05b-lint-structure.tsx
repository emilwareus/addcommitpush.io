import { CodeBlock, CodeCard, ComparisonSlide } from './comparison';

// Condensed from OAIZ's polint rule .polint/rules/src/bounded_context_imports.rs.
const boundedContextRule = `// local/backend-bounded-context-imports
fn rule(ctx, imports) {
  for import in imports {
    if crosses_context(import) {
      ctx.report("use domain events");
    }
  }
}`;

export function LintStructureSlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Lint the shape"
      claim="Lint the shape of your codebase, not just its style."
      source={{
        href: 'https://addcommitpush.io/blog/the-rules-of-vibe-coding',
        label: 'addcommitpush.io/blog/the-rules-of-vibe-coding',
      }}
      left={{
        heading: 'Style rules',
        caption: 'Generic linters know the language. They cannot know your architecture.',
        visual: (
          <CodeCard label="ESLINT · GENERIC" tone="worse">
            <CodeBlock>{`no-unused-vars   unused code
semi             semicolons
max-len          line length
eqeqeq           strict equality`}</CodeBlock>
          </CodeCard>
        ),
      }}
      right={{
        heading: 'Shape rules',
        caption:
          'Repo-local rules encode your boundaries: imports, a test per route, a flat app layer.',
        visual: (
          <CodeCard label="POLINT · OAIZ RULE, CONDENSED" tone="better">
            <CodeBlock>{boundedContextRule}</CodeBlock>
          </CodeCard>
        ),
      }}
    />
  );
}
