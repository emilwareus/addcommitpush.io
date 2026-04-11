import matter from "gray-matter";

import type {
  ParsedAnalysisDocument,
} from "../../contracts/analysis";
import type {
  InsightEvidenceItem,
  ParsedInsightDocument,
} from "../../contracts/insights";
import {
  validateAnalysisFrontmatter,
  validateInsightFrontmatter,
} from "../../contracts/validators";

const INSIGHT_HEADING_SEQUENCE = [
  "Claim",
  "Why It Matters",
  "Evidence",
  "Caveats",
  "Reuse Notes",
] as const;
const ANALYSIS_HEADING_SEQUENCE = [
  "Question",
  "Synthesis",
  "Contradictions",
  "Caveats",
  "Open Questions",
  "Next Moves",
] as const;
const NONE_NOTED_YET = "None noted yet.";

interface ParsedMarkdownSections<THeading extends string> {
  preamble: string[];
  sections: Record<THeading, string>;
}

export function parseInsightArtifact(document: string): ParsedInsightDocument {
  const parsedDocument = matter(normalizeDocument(document));
  const frontmatter = validateInsightFrontmatter(
    normalizeTimestampFields(parsedDocument.data, ["created_at", "updated_at"]),
  );
  const sections = parseSections(parsedDocument.content, INSIGHT_HEADING_SEQUENCE);
  const evidence = parseInsightEvidence(sections.sections.Evidence);
  const derivedFromSources = sortUnique(frontmatter.derived_from_sources);
  const evidenceSourceIds = sortUnique(evidence.map((item) => item.sourceId));

  if (derivedFromSources.join("|") !== evidenceSourceIds.join("|")) {
    throw new Error("Insight derived_from_sources must match Evidence source IDs");
  }

  return {
    frontmatter: {
      ...frontmatter,
      derived_from_sources: derivedFromSources,
      tags: sortUnique(frontmatter.tags),
      linked_analysis: sortUnique(frontmatter.linked_analysis),
      linked_reports: sortUnique(frontmatter.linked_reports),
    },
    sections: {
      claim: requireTextSection(sections.sections.Claim, "Claim"),
      whyItMatters: requireTextSection(sections.sections["Why It Matters"], "Why It Matters"),
      evidence,
      caveats: parseBulletListSection(sections.sections.Caveats, "Caveats"),
      reuseNotes: requireTextSection(sections.sections["Reuse Notes"], "Reuse Notes"),
    },
  };
}

export function renderInsightArtifact(document: ParsedInsightDocument): string {
  const frontmatter = validateInsightFrontmatter({
    ...document.frontmatter,
    derived_from_sources: sortUnique(document.frontmatter.derived_from_sources),
    tags: sortUnique(document.frontmatter.tags),
    linked_analysis: sortUnique(document.frontmatter.linked_analysis),
    linked_reports: sortUnique(document.frontmatter.linked_reports),
  });

  return [
    renderFrontmatter([
      ["id", frontmatter.id],
      ["title", frontmatter.title],
      ["status", frontmatter.status],
      ["confidence", frontmatter.confidence],
      ["derived_from_sources", frontmatter.derived_from_sources],
      ["tags", frontmatter.tags],
      ["linked_analysis", frontmatter.linked_analysis],
      ["linked_reports", frontmatter.linked_reports],
      ["created_at", frontmatter.created_at],
      ["updated_at", frontmatter.updated_at],
    ]),
    "# Insight",
    "",
    "## Claim",
    "",
    requireTextSection(document.sections.claim, "Claim"),
    "",
    "## Why It Matters",
    "",
    requireTextSection(document.sections.whyItMatters, "Why It Matters"),
    "",
    "## Evidence",
    "",
    ...renderInsightEvidence(document.sections.evidence),
    "",
    "## Caveats",
    "",
    ...renderBulletList(document.sections.caveats, "Caveats"),
    "",
    "## Reuse Notes",
    "",
    requireTextSection(document.sections.reuseNotes, "Reuse Notes"),
    "",
  ].join("\n");
}

export function parseAnalysisArtifact(document: string): ParsedAnalysisDocument {
  const parsedDocument = matter(normalizeDocument(document));
  const frontmatter = validateAnalysisFrontmatter(
    normalizeTimestampFields(parsedDocument.data, ["created_at", "updated_at"]),
  );
  const sections = parseSections(parsedDocument.content, ANALYSIS_HEADING_SEQUENCE);
  const derivedFromInsights = sortUnique(frontmatter.derived_from_insights);

  if (!frontmatter.transitional_scaffold && derivedFromInsights.length < 2) {
    throw new Error(
      "Analysis derived_from_insights must include at least two insights unless transitional_scaffold is true",
    );
  }

  return {
    frontmatter: {
      ...frontmatter,
      derived_from_insights: derivedFromInsights,
      tags: sortUnique(frontmatter.tags),
      linked_reports: sortUnique(frontmatter.linked_reports),
    },
    sections: {
      question: requireTextSection(sections.sections.Question, "Question"),
      synthesis: requireTextSection(sections.sections.Synthesis, "Synthesis"),
      contradictions: parseBulletListSection(
        sections.sections.Contradictions,
        "Contradictions",
      ),
      caveats: parseBulletListSection(sections.sections.Caveats, "Caveats"),
      openQuestions: parseBulletListSection(
        sections.sections["Open Questions"],
        "Open Questions",
      ),
      nextMoves: parseBulletListSection(sections.sections["Next Moves"], "Next Moves"),
    },
  };
}

export function renderAnalysisArtifact(document: ParsedAnalysisDocument): string {
  const frontmatter = validateAnalysisFrontmatter({
    ...document.frontmatter,
    derived_from_insights: sortUnique(document.frontmatter.derived_from_insights),
    tags: sortUnique(document.frontmatter.tags),
    linked_reports: sortUnique(document.frontmatter.linked_reports),
  });

  if (!frontmatter.transitional_scaffold && frontmatter.derived_from_insights.length < 2) {
    throw new Error(
      "Analysis derived_from_insights must include at least two insights unless transitional_scaffold is true",
    );
  }

  return [
    renderFrontmatter([
      ["id", frontmatter.id],
      ["title", frontmatter.title],
      ["status", frontmatter.status],
      ["confidence", frontmatter.confidence],
      ["derived_from_insights", frontmatter.derived_from_insights],
      ["tags", frontmatter.tags],
      ["linked_reports", frontmatter.linked_reports],
      ["transitional_scaffold", frontmatter.transitional_scaffold],
      ["created_at", frontmatter.created_at],
      ["updated_at", frontmatter.updated_at],
    ]),
    "# Analysis",
    "",
    "## Question",
    "",
    requireTextSection(document.sections.question, "Question"),
    "",
    "## Synthesis",
    "",
    requireTextSection(document.sections.synthesis, "Synthesis"),
    "",
    "## Contradictions",
    "",
    ...renderBulletList(document.sections.contradictions, "Contradictions"),
    "",
    "## Caveats",
    "",
    ...renderBulletList(document.sections.caveats, "Caveats"),
    "",
    "## Open Questions",
    "",
    ...renderBulletList(document.sections.openQuestions, "Open Questions"),
    "",
    "## Next Moves",
    "",
    ...renderBulletList(document.sections.nextMoves, "Next Moves"),
    "",
  ].join("\n");
}

function parseSections<THeading extends string>(
  markdownBody: string,
  expectedHeadings: readonly THeading[],
): ParsedMarkdownSections<THeading> {
  const lines = normalizeDocument(markdownBody).split("\n");
  const sectionOrder: THeading[] = [];
  const sectionBodies = new Map<THeading, string[]>();
  const preamble: string[] = [];
  let currentHeading: THeading | null = null;
  let hasSeenFirstHeading = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim() as THeading;

      if (!expectedHeadings.includes(heading)) {
        throw new Error(`Unexpected section heading: ${heading}`);
      }

      sectionOrder.push(heading);
      currentHeading = heading;
      hasSeenFirstHeading = true;
      sectionBodies.set(heading, []);
      continue;
    }

    if (!hasSeenFirstHeading) {
      preamble.push(line);
      continue;
    }

    if (!currentHeading) {
      throw new Error("Artifact body must contain section headings");
    }

    sectionBodies.get(currentHeading)?.push(line);
  }

  if (sectionOrder.length !== expectedHeadings.length) {
    throw new Error(
      `Artifact sections must match the canonical order: ${expectedHeadings.join(" -> ")}`,
    );
  }

  for (let index = 0; index < expectedHeadings.length; index += 1) {
    if (sectionOrder[index] !== expectedHeadings[index]) {
      throw new Error(
        `Artifact sections must match the canonical order: ${expectedHeadings.join(" -> ")}`,
      );
    }
  }

  if (preamble.some((line) => {
    const trimmedLine = line.trim();
    return trimmedLine.length > 0 && trimmedLine !== "# Insight" && trimmedLine !== "# Analysis";
  })) {
    throw new Error("Artifact preamble may only contain the canonical top-level heading");
  }

  const sections = {} as Record<THeading, string>;

  for (const heading of expectedHeadings) {
    const bodyLines = sectionBodies.get(heading);

    if (!bodyLines) {
      throw new Error(`Missing required section: ${heading}`);
    }

    sections[heading] = trimTrailingEmptyLines(bodyLines).join("\n").trim();
  }

  return {
    preamble,
    sections,
  };
}

function parseInsightEvidence(rawSection: string): InsightEvidenceItem[] {
  const bulletItems = parseBulletListSection(rawSection, "Evidence");

  return bulletItems.map((item) => {
    const match = /^`(SRC-[0-9]{4})`:\s+(.+)$/.exec(item);

    if (!match) {
      throw new Error(
        "Evidence bullets must use the format `SRC-0001`: support note",
      );
    }

    return {
      sourceId: match[1],
      note: match[2].trim(),
    };
  });
}

function requireTextSection(value: string, sectionName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${sectionName} section is required`);
  }

  return normalizedValue;
}

function parseBulletListSection(rawSection: string, sectionName: string): string[] {
  const lines = rawSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error(`${sectionName} section is required`);
  }

  const items = lines.map((line) => {
    if (!line.startsWith("- ")) {
      throw new Error(`${sectionName} section must use bullet items`);
    }

    const item = line.slice(2).trim();

    if (item.length === 0) {
      throw new Error(`${sectionName} section must not contain empty bullet items`);
    }

    return item;
  });

  return items;
}

function renderInsightEvidence(evidence: InsightEvidenceItem[]): string[] {
  const normalizedEvidence = evidence.map((item) => {
    const sourceId = item.sourceId.trim();
    const note = item.note.trim();

    if (!/^SRC-[0-9]{4}$/.test(sourceId)) {
      throw new Error(`Invalid insight evidence source ID: ${sourceId}`);
    }

    if (note.length === 0) {
      throw new Error("Insight evidence notes are required");
    }

    return `- \`${sourceId}\`: ${note}`;
  });

  if (normalizedEvidence.length === 0) {
    throw new Error("Evidence section is required");
  }

  return normalizedEvidence;
}

function renderBulletList(items: string[], sectionName: string): string[] {
  const normalizedItems = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (normalizedItems.length === 0) {
    throw new Error(`${sectionName} section is required`);
  }

  return normalizedItems.map((item) => `- ${item}`);
}

function renderFrontmatter(
  entries: ReadonlyArray<readonly [string, string | boolean | string[]]>,
): string {
  const lines = ["---"];

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        continue;
      }

      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
      continue;
    }

    if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
      continue;
    }

    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  lines.push("---", "");

  return lines.join("\n");
}

function normalizeDocument(document: string): string {
  return document.replace(/\r\n?/g, "\n");
}

function normalizeTimestampFields(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalizedValue = { ...value } as Record<string, unknown>;

  for (const key of keys) {
    const currentValue = normalizedValue[key];

    if (currentValue instanceof Date) {
      normalizedValue[key] = currentValue.toISOString();
    }
  }

  return normalizedValue;
}

function trimTrailingEmptyLines(lines: string[]): string[] {
  let endIndex = lines.length;

  while (endIndex > 0 && lines[endIndex - 1]?.trim().length === 0) {
    endIndex -= 1;
  }

  return lines.slice(0, endIndex);
}

function sortUnique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function isNoneNotedYet(value: string): boolean {
  return value.trim() === NONE_NOTED_YET;
}
