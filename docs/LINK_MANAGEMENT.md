# Link Management Best Practices

This document outlines best practices for managing external links in the addcommitpush.io codebase.

## Automated Link Checking

We maintain a link checker script to ensure all external links remain valid and accessible.

### Running the Link Checker

```bash
pnpm check-links
```

This script:

- Extracts all external links from the about page
- Tests each link for accessibility (HTTP 200 status)
- Reports broken or inaccessible links
- Exits with error code if any links are broken

### When to Run Link Checks

- Before committing changes that add or modify external links
- Periodically (monthly recommended) to catch link rot
- As part of CI/CD pipeline (recommended)

## Link Management Guidelines

### 1. Verify Links Before Adding

Always test links manually before adding them to the codebase:

- Click the link to ensure it works
- Verify it points to the intended content
- Check that the page loads in a reasonable time

### 2. Handle Bot-Blocked Links

Some websites return 403 Forbidden for automated requests but work in browsers. For these cases:

**Good:** Remove the link and keep the text

```tsx
// Instead of:
<a href="https://example.com/blocked">Organization Name</a>

// Use:
<span>Organization Name</span>
```

**Reason:** Links that don't work reliably for all users (including accessibility tools and crawlers) should be removed.

### 3. Prefer Stable URLs

- Use permalink URLs when available
- Avoid temporary or campaign URLs with tracking parameters (unless necessary)
- For academic papers, prefer DOI links over institutional repositories when possible

### 4. Link Text Best Practices

- Use descriptive link text (avoid "click here")
- Ensure link text makes sense out of context
- Include context about where the link leads

```tsx
// Good
<a href="...">Vulnerability Management Research Paper (PDF)</a>

// Avoid
<a href="...">here</a>
```

### 5. External Link Attributes

Always include these attributes for external links:

```tsx
<a
  href="https://external-site.com"
  target="_blank" // Opens in new tab
  rel="noopener noreferrer" // Security best practice
>
  Link Text
</a>
```

### 6. Handling Link Rot

When the link checker finds broken links:

1. **Investigate first:** Check if the URL has moved or been updated
2. **Search for alternatives:** Look for archived versions or updated URLs
3. **Update or remove:** Either update the URL or remove the broken link
4. **Document removal:** In git commits, explain why links were removed

### 7. Link Organization

Keep related links grouped and well-structured:

- Use consistent formatting for similar link types
- Group links by category (papers, talks, podcasts, etc.)
- Maintain visual hierarchy with proper heading levels

## Maintaining the Link Checker

The link checker script is located at `scripts/check-about-links.ts`.

### Extending the Checker

To check links in other pages, modify the `extractLinksFromAboutPage()` function:

```typescript
function extractLinksFromPage(pagePath: string): string[] {
  const content = readFileSync(pagePath, 'utf-8');
  const hrefMatches = content.match(/href="(https?:\/\/[^"]+)"/g) || [];
  // ... rest of extraction logic
}
```

### Configuration

Key configuration options in the script:

- `CONCURRENCY`: Number of parallel requests (default: 5)
- `timeout`: Request timeout in milliseconds (default: 10000)
- `method`: HTTP method to use (tries HEAD first, falls back to GET)

## CI/CD Integration (Recommended)

Add link checking to your GitHub Actions workflow:

```yaml
# .github/workflows/check-links.yml
name: Check Links
on:
  schedule:
    - cron: '0 0 1 * *' # Monthly
  pull_request:
    paths:
      - 'app/(pages)/about/**'

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm check-links
```

## Troubleshooting

### Link checker reports false positives

Some sites block automated requests. If a link works in browsers but fails in the checker:

1. Verify it's not actually broken
2. Consider if the link is essential
3. Remove the link if it's not reliable for all users

### Timeout errors

Increase the timeout in the script if legitimate sites are timing out:

```typescript
const timeoutId = setTimeout(() => controller.abort(), 15000); // Increase to 15s
```

## Resources

- [MDN: Creating Hyperlinks](https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Creating_hyperlinks)
- [Web.dev: Links and Link Text](https://web.dev/articles/link-text)
- [W3C: Understanding Link Purpose](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html)
