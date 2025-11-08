#!/usr/bin/env tsx

/**
 * Extract Post Text Script
 *
 * Extracts plain text content from blog post component files.
 * Useful for generating scripts for text-to-speech/audio generation.
 *
 * Usage:
 *   pnpm extract-text <slug> [output-name]
 *
 * Examples:
 *   pnpm extract-text recruiting-engineers-as-a-startup
 *   pnpm extract-text recruiting-engineers-as-a-startup recruiting-script
 *
 * Output:
 *   - Saves to: podcasts/scripts/<output-name>.txt
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const COMPONENTS_DIR = 'components/blog-posts';
const OUTPUT_DIR = 'podcasts/scripts';

interface ExtractionResult {
  title: string;
  text: string;
  wordCount: number;
}

function extractTextFromComponent(slug: string): ExtractionResult {
  const componentPath = join(COMPONENTS_DIR, `${slug}.tsx`);

  if (!existsSync(componentPath)) {
    throw new Error(`Component not found: ${componentPath}`);
  }

  const content = readFileSync(componentPath, 'utf-8');

  // Extract text from JSX by removing tags and cleaning up
  let text = content;

  // Remove imports
  text = text.replace(/^import\s+.*?$/gm, '');

  // Remove function declarations
  text = text.replace(/^export function.*?\{/gm, '');

  // Remove JSX tags but keep content
  text = text.replace(/<Figure[^>]*>/g, '');
  text = text.replace(/<\/Figure>/g, '');
  text = text.replace(/<BlogHeading[^>]*>(.*?)<\/BlogHeading>/g, '$1\n\n');
  text = text.replace(/<BlogList[^>]*>/g, '');
  text = text.replace(/<\/BlogList>/g, '');
  text = text.replace(/<BlogListItem>(.*?)<\/BlogListItem>/g, '• $1\n');
  text = text.replace(/<AudioPlayer[^>]*\/>/g, '');
  text = text.replace(/<div[^>]*>/g, '');
  text = text.replace(/<\/div>/g, '');
  text = text.replace(/<p>/g, '');
  text = text.replace(/<\/p>/g, '\n\n');
  text = text.replace(/<[^>]+>/g, '');

  // Clean up JSX expressions
  text = text.replace(/\{.*?\}/g, '');

  // Remove HTML entities
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  // Extract title (first meaningful line)
  const lines = text.split('\n').filter((line) => line.trim());
  const title = lines[0] || slug;

  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

  return {
    title,
    text,
    wordCount,
  };
}

function saveScript(text: string, outputName: string): string {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = join(OUTPUT_DIR, `${outputName}.txt`);
  writeFileSync(outputPath, text, 'utf-8');

  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Extract Post Text Script

Extracts plain text from blog post components for text-to-speech generation.

Usage:
  pnpm extract-text <slug> [output-name]

Arguments:
  slug         The blog post slug (e.g., "recruiting-engineers-as-a-startup")
  output-name  Optional output filename (default: same as slug)

Examples:
  pnpm extract-text recruiting-engineers-as-a-startup
  pnpm extract-text recruiting-engineers-as-a-startup recruiting-script

Output:
  - Text file saved to: ${OUTPUT_DIR}/<output-name>.txt
  - Plain text format, suitable for ElevenLabs or other TTS services

Note:
  - This extracts text from components/blog-posts/<slug>.tsx
  - Review and edit the output before using for audio generation
  - You may want to remove or rephrase visual-only content
    `);
    process.exit(0);
  }

  const slug = args[0];
  const outputName = args[1] || slug;

  try {
    console.log(`\n📄 Extracting text from: ${slug}`);

    const result = extractTextFromComponent(slug);

    console.log(`\n✅ Extraction complete!`);
    console.log(`   Words: ${result.wordCount}`);
    console.log(`   Characters: ${result.text.length}`);
    console.log(`   Estimated reading time: ${Math.ceil(result.wordCount / 200)} minutes`);

    const outputPath = saveScript(result.text, outputName);

    console.log(`\n💾 Script saved to: ${outputPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review the text file for accuracy`);
    console.log(`   2. Remove or adapt visual-only content (images, charts, etc.)`);
    console.log(`   3. Use with ElevenLabs or other TTS service`);
    console.log(``);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
