import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { RESEARCH_WORKSPACE_ROOT } from "../contracts/workspace";

const SAFE_RESEARCH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function resolveWorkspaceRoot(slug: string): string {
  assertSafeResearchSlug(slug);

  return `${RESEARCH_WORKSPACE_ROOT}/${slug}`;
}

export async function resolveWorkspacePath(
  projectRoot: string,
  slug: string,
  workspaceRelativePath: string,
): Promise<string> {
  assertProjectRoot(projectRoot);

  const normalizedRelativePath = normalizeWorkspaceRelativePath(workspaceRelativePath);
  const workspaceRoot = resolve(projectRoot, resolveWorkspaceRoot(slug));
  const resolvedPath = resolve(workspaceRoot, normalizedRelativePath);

  assertInsideRoot(workspaceRoot, resolvedPath);
  await assertNoSymlinkTraversal(workspaceRoot, normalizedRelativePath);

  return resolvedPath;
}

function assertProjectRoot(projectRoot: string): void {
  if (projectRoot.trim().length === 0) {
    throw new Error("Project root is required");
  }
}

function assertSafeResearchSlug(slug: string): void {
  if (!SAFE_RESEARCH_SLUG_PATTERN.test(slug)) {
    throw new Error(`Unsafe research slug: ${slug}`);
  }
}

function normalizeWorkspaceRelativePath(workspaceRelativePath: string): string {
  if (workspaceRelativePath.trim().length === 0) {
    throw new Error("Workspace path is required");
  }

  if (isAbsolute(workspaceRelativePath)) {
    throw new Error("Workspace paths must be relative");
  }

  const segments = workspaceRelativePath.split(/[\\/]+/);

  if (segments.some((segment) => segment === "..")) {
    throw new Error("Workspace paths must stay inside the research root");
  }

  return segments.filter((segment) => segment.length > 0 && segment !== ".").join("/");
}

function assertInsideRoot(rootPath: string, candidatePath: string): void {
  const relativePath = relative(rootPath, candidatePath);

  if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) {
    return;
  }

  throw new Error("Workspace paths must stay inside the research root");
}

async function assertNoSymlinkTraversal(
  workspaceRoot: string,
  normalizedRelativePath: string,
): Promise<void> {
  const rootRealPath = await realpath(workspaceRoot);
  const segments = normalizedRelativePath.split("/").filter(Boolean);
  let currentPath = workspaceRoot;

  for (const segment of segments) {
    currentPath = join(currentPath, segment);

    const stats = await readPathStats(currentPath);

    if (!stats) {
      continue;
    }

    if (stats.isSymbolicLink()) {
      throw new Error("Workspace paths must not traverse symlinks");
    }

    const currentRealPath = await realpath(currentPath);
    assertInsideRoot(rootRealPath, currentRealPath);
  }
}

async function readPathStats(targetPath: string) {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
