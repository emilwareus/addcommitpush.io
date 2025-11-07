#!/usr/bin/env tsx
/**
 * Image Optimization Script
 * Optimizes images in public/posts directories for web delivery
 * Generates AVIF, WebP, and optimized original formats
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, parse } from 'path';
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
