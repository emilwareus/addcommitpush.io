import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { resolve } from "node:path";

import {
  buildSourceCaptureDirectory,
  type WorkspaceDataBucketName,
} from "../../contracts/workspace";
import { type SourceCapture, type SourceCaptureKind } from "../../contracts/sources";
import {
  normalizeDataCaptureRef,
  resolveWorkspacePath,
} from "../../fs/workspace-paths";

export interface WriteSourceCaptureInput {
  projectRoot: string;
  slug: string;
  sourceId: string;
  captureKind: SourceCaptureKind;
  captureFilePath: string;
  capturedAt: string;
}

export async function writeSourceCapture(
  input: WriteSourceCaptureInput,
): Promise<SourceCapture> {
  const normalizedInput = await normalizeWriteSourceCaptureInput(input);
  const captureDirectory = buildSourceCaptureDirectory(
    mapCaptureKindToBucket(normalizedInput.captureKind),
    normalizedInput.sourceId,
    formatCaptureStamp(normalizedInput.capturedAt),
  );
  const relativeCapturePath = normalizeDataCaptureRef(
    `${captureDirectory}/${normalizedInput.fileName}`,
  );
  const absoluteCapturePath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    relativeCapturePath,
  );

  await mkdir(dirname(absoluteCapturePath), { recursive: true });
  await copyFile(normalizedInput.captureFilePath, absoluteCapturePath);

  return {
    kind: normalizedInput.captureKind,
    path: relativeCapturePath,
    captured_at: normalizedInput.capturedAt,
  };
}

interface NormalizedWriteSourceCaptureInput {
  projectRoot: string;
  slug: string;
  sourceId: string;
  captureKind: SourceCaptureKind;
  captureFilePath: string;
  capturedAt: string;
  fileName: string;
}

async function normalizeWriteSourceCaptureInput(
  input: WriteSourceCaptureInput,
): Promise<NormalizedWriteSourceCaptureInput> {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const sourceId = input.sourceId.trim();
  const captureFilePath = resolve(input.captureFilePath);
  const captureFileStats = await stat(captureFilePath);

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  if (sourceId.length === 0) {
    throw new Error("sourceId is required");
  }

  if (!captureFileStats.isFile()) {
    throw new Error(`Capture file is not a regular file: ${captureFilePath}`);
  }

  return {
    projectRoot,
    slug,
    sourceId,
    captureKind: input.captureKind,
    captureFilePath,
    capturedAt: normalizeIsoTimestamp(input.capturedAt, "capturedAt"),
    fileName: basename(captureFilePath),
  };
}

function mapCaptureKindToBucket(captureKind: SourceCaptureKind): WorkspaceDataBucketName {
  switch (captureKind) {
    case "snapshot":
      return "snapshots";
    case "export":
      return "exports";
    case "transcript":
      return "transcripts";
    case "dataset":
      return "datasets";
  }
}

function formatCaptureStamp(capturedAt: string): string {
  const date = new Date(capturedAt);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "T",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
    "Z",
  ].join("");
}

function normalizeIsoTimestamp(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required`);
  }

  const parsedTimestamp = new Date(normalizedValue);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new Error(`${label} must be a valid ISO timestamp`);
  }

  return parsedTimestamp.toISOString();
}
