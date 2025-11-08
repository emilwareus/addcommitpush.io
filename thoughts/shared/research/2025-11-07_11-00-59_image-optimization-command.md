---
date: 2025-11-07T10:00:59+0000
researcher: Claude Code
git_commit: afda235e1db82d83e810c77dd8a3baaf6c5a8787
branch: main
repository: addcommitpush.io
topic: "Creating an internal image optimization command"
tags: [research, codebase, images, optimization, seo, sharp, scripts]
status: complete
last_updated: 2025-11-07
last_updated_by: Claude Code
---

# Research: Creating an Internal Image Optimization Command

**Date**: 2025-11-07T10:00:59+0000
**Researcher**: Claude Code
**Git Commit**: afda235e1db82d83e810c77dd8a3baaf6c5a8787
**Branch**: main
**Repository**: addcommitpush.io

## Research Question

How to create an internal command that optimizes images for this Next.js 16 blog? The command should:
- Take existing images (currently too large for SEO)
- Optimize them for web delivery
- Name optimized versions with a suffix (e.g., "-optimized")
- Be available in package.json as a command
- Be easy to use by Claude Code

## Summary

The project should use **Sharp** (the industry-leading Node.js image optimization library) to create a TypeScript script following the existing pattern in `scripts/check-about-links.ts`. The script will:

1. Process images from `public/posts/<slug>/` directories
2. Generate multiple modern formats (AVIF, WebP) and optimized originals
3. Output to `public/posts/<slug>/` with naming convention: `<filename>-optimized.<ext>`
4. Be registered in package.json as `pnpm optimize-images`
5. Support batch processing with progress reporting

**Key findings**:
- Sharp is 4-5x faster than alternatives and has native TypeScript support
- The project already uses `tsx` for running TypeScript scripts (see `check-links` example)
- Currently only 1 blog post image exists: `public/posts/recruiting-engineers-as-a-startup/cover.png`
- Images should target <200KB for SEO with WebP/AVIF formats preferred
- The script pattern is well-established: shebang → interfaces → helpers → main() → error boundary

## Detailed Findings

### Component 1: Current Image State

**Location**: `public/posts/recruiting-engineers-as-a-startup/cover.png`

**Current issues**:
- Single PNG format (no modern WebP/AVIF alternatives)
- Unknown file size (likely unoptimized)
- No responsive size variants
- No optimization workflow in place

**Image usage pattern** (`app/(site)/blog/[slug]/page.tsx:90-102`):
```tsx
<Image
  src="/posts/recruiting-engineers-as-a-startup/cover.png"
  alt="Synthwave hacker, engineering recruitment"
  width={1200}
  height={630}
  priority
/>
```

**Storage convention**:
- Path: `public/posts/<slug>/<filename>`
- Referenced in code as: `/posts/<slug>/<filename>` (no /public prefix)
- Post metadata includes `cover?: string` field in interface

### Component 2: Existing Script Infrastructure

**Pattern reference**: `scripts/check-about-links.ts:1-142`

**Key elements**:
1. **Shebang** (line 1): `#!/usr/bin/env tsx`
2. **Imports**: Node.js built-ins (fs, path) + project modules via `@/*` aliases
3. **Interfaces**: Strongly-typed data structures (lines 10-15)
4. **Helper functions**: Async operations with error handling (lines 18-86)
5. **Main function**: Top-level async orchestrator (lines 89-136)
6. **Error boundary**: Catch-all with process.exit(1) (lines 138-141)
7. **Progress reporting**: User-friendly console output with emojis (line 105)

**Execution setup** (`package.json:10`):
```json
"check-links": "tsx scripts/check-about-links.ts"
```

**Dependencies available**:
- `tsx@^4.20.6` (devDependency for running TypeScript)
- TypeScript 5.x with strict mode
- ESM module support with bundler resolution
- Path aliases configured (`@/*` → project root)

### Component 3: Sharp Library Capabilities

**Source**: Web research findings

**Performance**:
- 4-5x faster than ImageMagick/Imagemin
- Processes 3MB JPEG in 6.38s (vs Imagemin's 9.31s)
- Better compression: 33.31% reduction for JPEG, 83% for PNG

**Format support**:
- Input: JPEG, PNG, WebP, AVIF, GIF, TIFF, SVG
- Output: JPEG, PNG, WebP, AVIF, GIF, TIFF
- Native TypeScript definitions (no @types package needed)

**Installation**:
```bash
pnpm add -D sharp
```

**Key APIs**:
```typescript
import sharp from 'sharp';

// Resize and convert to WebP
await sharp('input.png')
  .resize(1200, null, { withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile('output.webp');

// Generate AVIF (best compression)
await sharp('input.png')
  .avif({ quality: 75 })
  .toFile('output.avif');

// Optimized JPEG with mozjpeg
await sharp('input.jpg')
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile('output-optimized.jpg');
```

**Recommended quality settings**:
- JPEG: quality 85 with mozjpeg: true
- PNG: compressionLevel 8-9
- WebP: quality 80 (lossy)
- AVIF: quality 75 (50% better compression than JPEG)

### Component 4: SEO Best Practices

**File size targets** (2025 standards):
- Hero/cover images: 50-100KB (target)
- Maximum: 200KB per image
- Thumbnails: 10-30KB

**Format strategy**:
1. AVIF (primary): 50% smaller than JPEG, 80% browser support
2. WebP (fallback): 25-30% smaller than JPEG, 96% browser support
3. Optimized JPEG (legacy): Universal support

**Next.js integration**:
- Use `next/image` component (already implemented)
- Automatic format negotiation based on browser support
- Runtime optimization for production builds

### Component 5: Implementation Architecture

**Recommended approach**:

1. **Script location**: `scripts/optimize-images.ts`
2. **Command**: `pnpm optimize-images [directory]`
3. **Batch processing**: 4-5 concurrent operations (avoid overwhelming the system)
4. **Output naming**: `<basename>-optimized.<ext>`
5. **Formats generated**: AVIF, WebP, optimized original

**Workflow**:
```
Input: public/posts/my-post/cover.png (500KB)
Output:
  - public/posts/my-post/cover-optimized.avif (40KB)
  - public/posts/my-post/cover-optimized.webp (65KB)
  - public/posts/my-post/cover-optimized.png (180KB)
```

**Script structure** (based on existing pattern):
```typescript
#!/usr/bin/env tsx
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface OptimizationResult {
  input: string;
  outputs: Array<{ format: string; size: number; path: string }>;
  error?: string;
}

async function optimizeImage(inputPath: string): Promise<OptimizationResult> {
  // Implementation
}

async function main() {
  const postsDir = join(process.cwd(), 'public/posts');
  // Process all images in posts subdirectories
  // Report progress
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

## Code References

- **Existing script pattern**: `scripts/check-about-links.ts:1-142` - Complete reference implementation
- **Script registration**: `package.json:10` - npm script definition
- **Post interface**: `lib/posts.ts:8` - Includes `cover?: string` field
- **Image usage**: `app/(site)/blog/[slug]/page.tsx:91-98` - next/image implementation
- **TypeScript config**: `tsconfig.json:1-29` - Compiler settings for scripts
- **tsx dependency**: `package.json:71` - TypeScript execution runtime

## Architecture Insights

### Pattern: TypeScript Scripts with tsx

This project has established a clean pattern for build-time automation:
- Scripts live in `scripts/` directory
- Use tsx for JIT TypeScript execution (no build step needed)
- Follow consistent structure: shebang → interfaces → helpers → main → error handling
- Registered in package.json for easy invocation
- Full access to project code via TypeScript path aliases

### Pattern: Image Asset Organization

Images follow a clear convention:
- Storage: `public/posts/<slug>/<filename>`
- Reference: `/posts/<slug>/<filename>` (public/ implicit)
- Metadata: `cover?: string` in Post interface
- Component: `next/image` with explicit dimensions

### Pattern: Batch Processing with Concurrency

The existing `check-about-links.ts` script demonstrates proper batch processing:
- Process items in batches of 5 (`CONCURRENCY = 5`)
- Use `Promise.all()` for concurrent operations within batch
- Report progress after each batch
- Prevents overwhelming external services or system resources

## Implementation Recommendations

### Recommended Script Implementation

```typescript
#!/usr/bin/env tsx
/**
 * Image Optimization Script
 * Optimizes images in public/posts directories for web delivery
 * Generates AVIF, WebP, and optimized original formats
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, parse, extname } from 'path';
import pLimit from 'p-limit';

interface OptimizationResult {
  input: string;
  outputs: Array<{
    format: string;
    size: number;
    path: string;
    savings: string;
  }>;
  originalSize: number;
  error?: string;
}

interface Config {
  quality: {
    avif: number;
    webp: number;
    jpeg: number;
    png: number;
  };
  concurrency: number;
  targetFormats: ('avif' | 'webp' | 'original')[];
}

const config: Config = {
  quality: {
    avif: 75,
    webp: 80,
    jpeg: 85,
    png: 9,
  },
  concurrency: 4,
  targetFormats: ['avif', 'webp', 'original'],
};

async function findImages(directory: string): Promise<string[]> {
  const images: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      images.push(...(await findImages(fullPath)));
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name) && !entry.name.includes('-optimized')) {
      images.push(fullPath);
    }
  }

  return images;
}

async function optimizeImage(inputPath: string): Promise<OptimizationResult> {
  const { dir, name, ext } = parse(inputPath);
  const result: OptimizationResult = {
    input: inputPath,
    outputs: [],
    originalSize: (await stat(inputPath)).size,
  };

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Generate AVIF (best compression)
    if (config.targetFormats.includes('avif')) {
      const avifPath = join(dir, `${name}-optimized.avif`);
      await sharp(inputPath)
        .avif({ quality: config.quality.avif, effort: 6 })
        .toFile(avifPath);

      const avifSize = (await stat(avifPath)).size;
      result.outputs.push({
        format: 'AVIF',
        size: avifSize,
        path: avifPath,
        savings: `${(((result.originalSize - avifSize) / result.originalSize) * 100).toFixed(1)}%`,
      });
    }

    // Generate WebP (fallback)
    if (config.targetFormats.includes('webp')) {
      const webpPath = join(dir, `${name}-optimized.webp`);
      await sharp(inputPath)
        .webp({ quality: config.quality.webp })
        .toFile(webpPath);

      const webpSize = (await stat(webpPath)).size;
      result.outputs.push({
        format: 'WebP',
        size: webpSize,
        path: webpPath,
        savings: `${(((result.originalSize - webpSize) / result.originalSize) * 100).toFixed(1)}%`,
      });
    }

    // Optimize original format
    if (config.targetFormats.includes('original')) {
      const optimizedPath = join(dir, `${name}-optimized${ext}`);

      if (ext.toLowerCase() === '.png') {
        await sharp(inputPath)
          .png({ compressionLevel: config.quality.png })
          .toFile(optimizedPath);
      } else {
        await sharp(inputPath)
          .jpeg({ quality: config.quality.jpeg, mozjpeg: true })
          .toFile(optimizedPath);
      }

      const optimizedSize = (await stat(optimizedPath)).size;
      result.outputs.push({
        format: ext.substring(1).toUpperCase(),
        size: optimizedSize,
        path: optimizedPath,
        savings: `${(((result.originalSize - optimizedSize) / result.originalSize) * 100).toFixed(1)}%`,
      });
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function main() {
  const targetDir = process.argv[2] || 'public/posts';
  const fullPath = join(process.cwd(), targetDir);

  console.log('🖼️  Image Optimization Tool\n');
  console.log(`Scanning: ${targetDir}\n`);

  // Find all images
  const images = await findImages(fullPath);

  if (images.length === 0) {
    console.log('No images found to optimize.');
    process.exit(0);
  }

  console.log(`Found ${images.length} image(s) to optimize\n`);

  // Process with concurrency limit
  const limit = pLimit(config.concurrency);
  let processed = 0;

  const tasks = images.map((imagePath) =>
    limit(async () => {
      const result = await optimizeImage(imagePath);
      processed++;

      if (result.error) {
        console.log(`✗ ${result.input}`);
        console.log(`  Error: ${result.error}\n`);
      } else {
        const relativePath = result.input.replace(process.cwd(), '');
        console.log(`✓ ${relativePath} (${formatBytes(result.originalSize)})`);

        for (const output of result.outputs) {
          console.log(`  → ${output.format}: ${formatBytes(output.size)} (saved ${output.savings})`);
        }
        console.log();
      }

      console.log(`Progress: ${processed}/${images.length}\n`);
    })
  );

  await Promise.all(tasks);

  console.log('✨ Optimization complete!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### Installation Steps

1. **Install Sharp and p-limit**:
```bash
pnpm add -D sharp p-limit
pnpm add -D @types/node  # If not already installed
```

2. **Create script file**:
```bash
touch scripts/optimize-images.ts
chmod +x scripts/optimize-images.ts
```

3. **Add to package.json**:
```json
{
  "scripts": {
    "optimize-images": "tsx scripts/optimize-images.ts"
  }
}
```

4. **Usage**:
```bash
# Optimize all images in public/posts
pnpm optimize-images

# Optimize images in specific directory
pnpm optimize-images public/posts/my-post
```

### Expected Output

```
🖼️  Image Optimization Tool

Scanning: public/posts

Found 1 image(s) to optimize

✓ /public/posts/recruiting-engineers-as-a-startup/cover.png (450KB)
  → AVIF: 35KB (saved 92.2%)
  → WebP: 58KB (saved 87.1%)
  → PNG: 165KB (saved 63.3%)

Progress: 1/1

✨ Optimization complete!
```

### Next.js Integration

After optimization, update image references to use modern formats:

**Option 1: Update Post Metadata**
```typescript
{
  title: "Recruiting engineers as a startup",
  slug: "recruiting-engineers-as-a-startup",
  cover: "/posts/recruiting-engineers-as-a-startup/cover-optimized.webp",
  // ...
}
```

**Option 2: Use Picture Element** (for maximum compatibility):
```tsx
<picture>
  <source
    srcSet="/posts/recruiting-engineers-as-a-startup/cover-optimized.avif"
    type="image/avif"
  />
  <source
    srcSet="/posts/recruiting-engineers-as-a-startup/cover-optimized.webp"
    type="image/webp"
  />
  <Image
    src="/posts/recruiting-engineers-as-a-startup/cover-optimized.png"
    alt="Synthwave hacker, engineering recruitment"
    width={1200}
    height={630}
    priority
  />
</picture>
```

**Option 3: Let Next.js Handle It** (simplest):
- Just use the optimized WebP/AVIF files with next/image
- Next.js will automatically serve the best format based on browser support
- Simply update the `cover` path to point to `-optimized` version

## Related Resources

### Documentation Links
- [Sharp Official Documentation](https://sharp.pixelplumbing.com/)
- [Sharp GitHub Repository](https://github.com/lovell/sharp)
- [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images)
- [Next.js Image Component API](https://nextjs.org/docs/app/api-reference/components/image)
- [Google Image SEO Best Practices](https://developers.google.com/search/docs/appearance/google-images)

### Performance & Benchmarks
- [Sharp vs Imagemin Comparison](https://blockqueue.io/blog/2024-09-22-sharp-vs-imagemin-comparison)
- [Image Format Comparison 2025](https://www.thecssagency.com/blog/best-web-image-format)
- [2025 Guide to Image Resizing for SEO](https://searchxpro.com/2025-guide-to-image-resizing-for-seo/)

### Tutorials & Guides
- [Optimize Images with Sharp - Codú](https://www.codu.co/articles/optimize-and-transform-images-in-node-js-with-sharp-z8dyo7wi)
- [Sharp Batch Processing Patterns - Medium](https://medium.com/@pradipcpgn/using-sharp-as-image-optimization-tool-in-node-js-04f2efa59dbd)
- [Responsive Images Tutorial - imgix](https://docs.imgix.com/en-US/getting-started/tutorials/responsive-design/responsive-images-with-srcset)
- [MDN Responsive Images Guide](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

### Alternative Tools
- [next-image-export-optimizer](https://www.npmjs.com/package/next-image-export-optimizer) - Build-time optimization for static exports
- [next-export-optimize-images](https://next-export-optimize-images.vercel.app/) - Alternative static export optimizer
- [Squoosh (browser)](https://squoosh.app/) - Manual browser-based optimization

## Open Questions

1. **Automated integration**: Should the optimization script run automatically on pre-commit or build, or remain manual?
   - Consideration: Manual gives more control but requires discipline
   - Recommendation: Start manual, consider pre-commit hook later

2. **Original file handling**: Should the script replace original files or keep both versions?
   - Current recommendation: Keep originals, suffix optimized versions
   - Alternative: Replace originals, keep backups in separate directory

3. **Responsive variants**: Should the script generate multiple size variants (e.g., 640w, 1080w, 1920w)?
   - Current approach: Single optimized version, let Next.js handle responsive
   - Alternative: Generate srcset variants for maximum performance

4. **CI/CD integration**: Should this run in GitHub Actions on every commit?
   - Consideration: Adds build time but ensures all images are optimized
   - Recommendation: Add as optional workflow or pre-deployment step

5. **SVG optimization**: The current script doesn't handle SVGs (which Sharp doesn't optimize)
   - Consideration: 6 SVG files in public/ (icons/logos)
   - Recommendation: Add SVGO as separate optional step if needed
