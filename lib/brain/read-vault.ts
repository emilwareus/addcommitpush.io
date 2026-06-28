import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { extractFrontmatterWikiLinks, extractWikiLinks } from '@/lib/brain/links';
import type { BrainGraphEdge, BrainLink, PublishedBrainNote } from '@/lib/brain/types';

const brainRoot = join(process.cwd(), 'brain');

const publishedNoteSchema = z
  .object({
    type: z.enum(['insight', 'source', 'post-seed', 'note']),
    title: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    created: z.union([z.string().min(1), z.date()]).transform((value) => {
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }

      return value;
    }),
    status: z.string().min(1),
    publish: z.literal(true),
    tags: z.array(z.string().min(1)).default([]),
    updated: z
      .union([z.string().min(1), z.date()])
      .optional()
      .transform((value) => {
        if (value instanceof Date) {
          return value.toISOString().slice(0, 10);
        }

        return value;
      }),
  })
  .passthrough();

type PublishedNoteFrontmatter = z.infer<typeof publishedNoteSchema>;

const linkFrontmatterFields = [
  'related',
  'related_notes',
  'sources',
  'source_notes',
  'supports',
  'supported_by',
  'builds_on',
  'feeds_into',
  'post_seeds',
] as const;

interface ParsedMarkdownFile {
  filePath: string;
  content: string;
  data: Record<string, unknown>;
}

let publishedBrainNotesCache: PublishedBrainNote[] | null = null;

function getMarkdownFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return getMarkdownFiles(entryPath);
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      return [];
    }

    return [entryPath];
  });
}

function readMarkdownFile(filePath: string): ParsedMarkdownFile {
  const rawFile = readFileSync(filePath, 'utf8');
  const parsed = matter(rawFile);

  return {
    filePath: relative(process.cwd(), filePath).replaceAll('\\', '/'),
    content: parsed.content.trim(),
    data: parsed.data,
  };
}

function isPublishTrue(data: Record<string, unknown>) {
  return data.publish === true;
}

function deriveExcerpt(content: string) {
  const paragraph = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => {
      return (
        block.length > 0 &&
        !block.startsWith('#') &&
        !block.startsWith('```') &&
        !block.startsWith('|') &&
        !block.startsWith('---')
      );
    });

  if (!paragraph) {
    throw new Error('Published brain note needs a body paragraph for its excerpt.');
  }

  return paragraph.replace(/\s+/g, ' ').slice(0, 220);
}

function getFrontmatterLinks(data: PublishedNoteFrontmatter): BrainLink[] {
  return linkFrontmatterFields.flatMap((field) => {
    return extractFrontmatterWikiLinks(data[field]).map((link) => ({
      ...link,
      relation: field.replaceAll('_', '-'),
    }));
  });
}

function toPublishedBrainNote(file: ParsedMarkdownFile): PublishedBrainNote {
  const parsed = publishedNoteSchema.safeParse(file.data);

  if (!parsed.success) {
    throw new Error(
      `Invalid published brain note frontmatter in ${file.filePath}: ${parsed.error.message}`
    );
  }

  const bodyLinks: BrainLink[] = extractWikiLinks(file.content).map((link) => ({
    ...link,
    relation: 'links-to',
  }));
  const frontmatterLinks = getFrontmatterLinks(parsed.data);
  const linksByKey = new Map(
    [...frontmatterLinks, ...bodyLinks].map((link) => [
      `${link.relation}:${link.targetSlug}:${link.label}`,
      link,
    ])
  );
  const links = Array.from(linksByKey.values());
  const excerpt = deriveExcerpt(file.content);
  const searchText = [
    parsed.data.title,
    parsed.data.slug,
    parsed.data.type,
    parsed.data.status,
    file.filePath,
    excerpt,
    file.content,
    ...parsed.data.tags,
    ...links.flatMap((link) => [link.targetSlug, link.label, link.relation]),
  ]
    .join(' ')
    .toLowerCase();

  return {
    type: parsed.data.type,
    title: parsed.data.title,
    slug: parsed.data.slug,
    created: parsed.data.created,
    status: parsed.data.status,
    publish: true,
    tags: parsed.data.tags,
    updated: parsed.data.updated,
    excerpt,
    content: file.content,
    filePath: file.filePath,
    links,
    searchText,
  };
}

function validateBrainNotes(notes: PublishedBrainNote[]) {
  const noteBySlug = new Map<string, PublishedBrainNote>();

  notes.forEach((note) => {
    const existingNote = noteBySlug.get(note.slug);

    if (existingNote) {
      throw new Error(
        `Duplicate published brain note slug "${note.slug}" in ${existingNote.filePath} and ${note.filePath}`
      );
    }

    noteBySlug.set(note.slug, note);
  });

  notes.forEach((note) => {
    note.links.forEach((link) => {
      if (!noteBySlug.has(link.targetSlug)) {
        throw new Error(`Broken brain wikilink in ${note.filePath}: [[${link.targetSlug}]]`);
      }
    });
  });
}

function readPublishedBrainNotes() {
  const files = getMarkdownFiles(brainRoot).map(readMarkdownFile);
  const publishedNotes = files.filter((file) => isPublishTrue(file.data)).map(toPublishedBrainNote);

  validateBrainNotes(publishedNotes);

  return publishedNotes.sort((a, b) => {
    const dateDifference = new Date(b.created).getTime() - new Date(a.created).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return a.title.localeCompare(b.title);
  });
}

export function getAllPublishedBrainNotes(): PublishedBrainNote[] {
  publishedBrainNotesCache ??= readPublishedBrainNotes();

  return [...publishedBrainNotesCache];
}

export function getPublishedBrainNoteBySlug(slug: string): PublishedBrainNote | null {
  return getAllPublishedBrainNotes().find((note) => note.slug === slug) ?? null;
}

export function getAllPublishedBrainSlugs(): string[] {
  return getAllPublishedBrainNotes().map((note) => note.slug);
}

export function getAllBrainTags(): string[] {
  return Array.from(new Set(getAllPublishedBrainNotes().flatMap((note) => note.tags))).sort();
}

export function getAllBrainStatuses(): string[] {
  return Array.from(new Set(getAllPublishedBrainNotes().map((note) => note.status))).sort();
}

export function getBrainGraphEdges(): BrainGraphEdge[] {
  return getAllPublishedBrainNotes().flatMap((note) => {
    return note.links.map((link) => ({
      id: `${note.slug}->${link.targetSlug}:${link.relation}`,
      sourceSlug: note.slug,
      targetSlug: link.targetSlug,
      relation: link.relation,
    }));
  });
}

export function getPublishedBrainSlugSet(): Set<string> {
  return new Set(getAllPublishedBrainSlugs());
}
