import { lstat, readFile } from "node:fs/promises";

import { validateManifest, validateSourcesDocument } from "../contracts/validators";
import { resolveResearchWorkspacePaths } from "../fs/workspace-paths";

import { createWorkspaceResearchId } from "./id";
import {
  createInitialResearchManifest,
  createInitialSourcesDocument,
  seedResearchWorkspace,
} from "./workspace-seed";

const RESEARCH_TEMPLATE_URL = new URL(
  "../../../../researcher/templates/RESEARCH.md",
  import.meta.url,
);

export interface InitResearchWorkspaceInput {
  projectRoot: string;
  slug: string;
  title: string;
  question: string;
  audience?: string;
  tags?: string[];
}

export interface InitResearchWorkspaceResult {
  researchId: string;
  workspacePath: string;
}

export async function initResearchWorkspace(
  input: InitResearchWorkspaceInput,
): Promise<InitResearchWorkspaceResult> {
  const normalizedInput = normalizeInitResearchWorkspaceInput(input);
  const workspacePaths = resolveResearchWorkspacePaths(
    normalizedInput.projectRoot,
    normalizedInput.slug,
  );

  await assertWorkspaceDoesNotExist(workspacePaths.workspaceRoot);

  const researchId = createWorkspaceResearchId(normalizedInput.slug);
  const briefTemplate = await readFile(RESEARCH_TEMPLATE_URL, "utf8");
  const manifest = validateManifest(
    createInitialResearchManifest({
      researchId,
      slug: normalizedInput.slug,
      title: normalizedInput.title,
      question: normalizedInput.question,
    }),
  );
  const sourcesEnvelope = validateSourcesDocument(
    createInitialSourcesDocument(researchId),
  );
  const briefContent = renderResearchBrief({
    template: briefTemplate,
    researchId,
    title: normalizedInput.title,
    question: normalizedInput.question,
    audience: normalizedInput.audience,
    tags: normalizedInput.tags,
    now: new Date(),
  });

  await seedResearchWorkspace({
    workspacePaths,
    briefContent,
    manifest,
    sourcesEnvelope,
  });

  return {
    researchId,
    workspacePath: workspacePaths.workspaceRoot,
  };
}

interface NormalizedInitResearchWorkspaceInput {
  projectRoot: string;
  slug: string;
  title: string;
  question: string;
  audience: string;
  tags: string[];
}

interface RenderResearchBriefInput {
  template: string;
  researchId: string;
  title: string;
  question: string;
  audience: string;
  tags: string[];
  now: Date;
}

function normalizeInitResearchWorkspaceInput(
  input: InitResearchWorkspaceInput,
): NormalizedInitResearchWorkspaceInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const question = input.question.trim();
  const audience = input.audience?.trim() || "internal";
  const tags = Array.from(
    new Set(
      (input.tags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  if (title.length === 0) {
    throw new Error("title is required");
  }

  if (question.length === 0) {
    throw new Error("question is required");
  }

  return {
    projectRoot,
    slug,
    title,
    question,
    audience,
    tags,
  };
}

function renderResearchBrief(input: RenderResearchBriefInput): string {
  const date = formatDateOnly(input.now);
  const tagsBlock =
    input.tags.length === 0 ? "tags: []" : ["tags:", ...input.tags.map((tag) => `  - ${tag}`)].join("\n");

  return input.template
    .replace("id: RES-YYYYMMDD-slug", `id: ${input.researchId}`)
    .replace("title: Research Title", `title: ${input.title}`)
    .replace("created_at: YYYY-MM-DD", `created_at: ${date}`)
    .replace("updated_at: YYYY-MM-DD", `updated_at: ${date}`)
    .replace("audience: internal", `audience: ${input.audience}`)
    .replace("tags:\n  - tag-one\n  - tag-two", tagsBlock)
    .replace("[What are we trying to understand or prove?]", input.question)
    .replace(
      "1. [Question]\n2. [Question]\n3. [Question]",
      `1. ${input.question}`,
    );
}

function formatDateOnly(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

async function assertWorkspaceDoesNotExist(workspaceRoot: string): Promise<void> {
  try {
    await lstat(workspaceRoot);
    throw new Error(`Research workspace already exists at ${workspaceRoot}`);
  } catch (error) {
    if (isMissingPathError(error)) {
      return;
    }

    throw error;
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
