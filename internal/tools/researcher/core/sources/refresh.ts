import {
  SOURCE_CAPTURE_KIND_VALUES,
  SOURCE_STATUS_VALUES,
  type SourceCapture,
  type SourceCaptureKind,
  type SourceRecord,
  type SourceSideState,
  type SourceStatus,
} from "../../contracts/sources";

import {
  loadSourceStore,
  persistSourceStore,
  syncSourceManifestState,
} from "./store";
import { propagateFreshness } from "../freshness/propagation";
import { normalizeCanonicalUrl } from "./normalize";
import { writeSourceCapture } from "./captures";

export interface RefreshSourceInput {
  projectRoot: string;
  slug: string;
  sourceId?: string;
  canonicalUrl?: string;
  status?: SourceStatus;
  accessedAt?: string;
  lastCheckedAt?: string;
  captureKind?: SourceCaptureKind;
  captureFile?: string;
  capturedAt?: string;
  markStale?: boolean;
  clearStale?: boolean;
  markSuperseded?: boolean;
  clearSuperseded?: boolean;
  markRejected?: boolean;
  clearRejected?: boolean;
  now?: Date;
}

export interface RefreshSourceResult {
  sourceId: string;
  canonicalUrl: string;
  refreshedAt: string;
  latestCapturePath: string | null;
  sideStates: SourceSideState[];
}

export async function refreshSource(input: RefreshSourceInput): Promise<RefreshSourceResult> {
  const normalizedInput = normalizeRefreshSourceInput(input);
  const store = await loadSourceStore(normalizedInput);
  const source = findSourceRecord(store.sources.sources, normalizedInput);
  const capture = await maybeWriteCapture(normalizedInput, source.id);
  const accessTimestamp = normalizedInput.accessedAt ?? capture?.captured_at ?? source.accessed_at;
  const checkedTimestamp =
    normalizedInput.lastCheckedAt ?? capture?.captured_at ?? source.last_checked_at;

  source.status = normalizedInput.status ?? source.status;
  source.updated_at = normalizedInput.operationTimestamp;
  source.accessed_at = accessTimestamp;
  source.last_checked_at = checkedTimestamp;

  if (capture) {
    source.captures.push(capture);
    source.latest_capture_path = capture.path;
  }

  source.side_states = finalizeSourceSideStates({
    source,
    freshnessWindowDays: store.manifest.freshness.window_days,
    operationTimestamp: normalizedInput.operationTimestamp,
    markStale: normalizedInput.markStale,
    clearStale: normalizedInput.clearStale,
    markSuperseded: normalizedInput.markSuperseded,
    clearSuperseded: normalizedInput.clearSuperseded,
    markRejected: normalizedInput.markRejected,
    clearRejected: normalizedInput.clearRejected,
  });

  store.sources.updated_at = normalizedInput.operationTimestamp;
  syncSourceManifestState(store.manifest, store.sources, normalizedInput.operationTimestamp);
  await persistSourceStore(store);
  await propagateFreshness({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
    sources: store.sources.sources,
  });

  return {
    sourceId: source.id,
    canonicalUrl: source.canonical_url,
    refreshedAt: normalizedInput.operationTimestamp,
    latestCapturePath: source.latest_capture_path,
    sideStates: [...source.side_states],
  };
}

interface NormalizedRefreshSourceInput {
  projectRoot: string;
  slug: string;
  sourceId: string | null;
  canonicalUrl: string | null;
  status: SourceStatus | null;
  accessedAt: string | null;
  lastCheckedAt: string | null;
  captureKind: SourceCaptureKind | null;
  captureFile: string | null;
  capturedAt: string | null;
  markStale: boolean;
  clearStale: boolean;
  markSuperseded: boolean;
  clearSuperseded: boolean;
  markRejected: boolean;
  clearRejected: boolean;
  operationTimestamp: string;
}

interface FinalizeSourceSideStatesInput {
  source: SourceRecord;
  freshnessWindowDays: number;
  operationTimestamp: string;
  markStale: boolean;
  clearStale: boolean;
  markSuperseded: boolean;
  clearSuperseded: boolean;
  markRejected: boolean;
  clearRejected: boolean;
}

function normalizeRefreshSourceInput(input: RefreshSourceInput): NormalizedRefreshSourceInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const sourceId = normalizeNullableText(input.sourceId);
  const canonicalUrlInput = normalizeNullableText(input.canonicalUrl);
  const now = input.now ?? new Date();
  const operationTimestamp = now.toISOString();

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  if (!sourceId && !canonicalUrlInput) {
    throw new Error("Either sourceId or canonicalUrl is required");
  }

  if ((input.captureKind && !input.captureFile) || (!input.captureKind && input.captureFile)) {
    throw new Error("captureKind and captureFile must be provided together");
  }

  return {
    projectRoot,
    slug,
    sourceId,
    canonicalUrl: canonicalUrlInput ? normalizeCanonicalUrl(canonicalUrlInput) : null,
    status: input.status ? parseStatus(input.status) : null,
    accessedAt: normalizeNullableTimestamp(input.accessedAt, "accessedAt"),
    lastCheckedAt: normalizeNullableTimestamp(input.lastCheckedAt, "lastCheckedAt"),
    captureKind: input.captureKind ? parseCaptureKind(input.captureKind) : null,
    captureFile: normalizeNullableText(input.captureFile),
    capturedAt: normalizeNullableTimestamp(input.capturedAt, "capturedAt"),
    markStale: Boolean(input.markStale),
    clearStale: Boolean(input.clearStale),
    markSuperseded: Boolean(input.markSuperseded),
    clearSuperseded: Boolean(input.clearSuperseded),
    markRejected: Boolean(input.markRejected),
    clearRejected: Boolean(input.clearRejected),
    operationTimestamp,
  };
}

function findSourceRecord(
  sources: SourceRecord[],
  input: NormalizedRefreshSourceInput,
): SourceRecord {
  const sourceById = input.sourceId
    ? sources.find((source) => source.id === input.sourceId) ?? null
    : null;
  const sourceByCanonicalUrl = input.canonicalUrl
    ? sources.find((source) => source.canonical_url === input.canonicalUrl) ?? null
    : null;

  if (input.sourceId && !sourceById) {
    throw new Error(`Source not found: ${input.sourceId}`);
  }

  if (input.canonicalUrl && !sourceByCanonicalUrl) {
    throw new Error(`Source not found for canonicalUrl: ${input.canonicalUrl}`);
  }

  if (sourceById && sourceByCanonicalUrl && sourceById.id !== sourceByCanonicalUrl.id) {
    throw new Error("sourceId and canonicalUrl refer to different source records");
  }

  const source = sourceById ?? sourceByCanonicalUrl;

  if (!source) {
    throw new Error("Unable to resolve source record");
  }

  return source;
}

async function maybeWriteCapture(
  input: NormalizedRefreshSourceInput,
  sourceId: string,
): Promise<SourceCapture | null> {
  if (!input.captureKind || !input.captureFile) {
    return null;
  }

  return writeSourceCapture({
    projectRoot: input.projectRoot,
    slug: input.slug,
    sourceId,
    captureKind: input.captureKind,
    captureFilePath: input.captureFile,
    capturedAt: input.capturedAt ?? input.operationTimestamp,
  });
}

function finalizeSourceSideStates(
  input: FinalizeSourceSideStatesInput,
): SourceSideState[] {
  const sideStates = new Set<SourceSideState>(input.source.side_states);
  const freshnessSignal = resolveFreshnessSignal(input.source);
  const derivedStale = isOutsideFreshnessWindow(
    freshnessSignal,
    input.operationTimestamp,
    input.freshnessWindowDays,
  );

  if (derivedStale) {
    sideStates.add("stale");
  } else {
    sideStates.delete("stale");
  }

  if (input.markStale) {
    sideStates.add("stale");
  }

  if (input.clearStale) {
    sideStates.delete("stale");
  }

  applyManualSideStateOverride(sideStates, "superseded", input.markSuperseded, input.clearSuperseded);
  applyManualSideStateOverride(sideStates, "rejected", input.markRejected, input.clearRejected);

  return Array.from(sideStates);
}

function resolveFreshnessSignal(source: SourceRecord): string | null {
  if (source.last_checked_at) {
    return source.last_checked_at;
  }

  if (source.accessed_at) {
    return source.accessed_at;
  }

  return source.captures.at(-1)?.captured_at ?? null;
}

function isOutsideFreshnessWindow(
  freshnessSignal: string | null,
  operationTimestamp: string,
  freshnessWindowDays: number,
): boolean {
  if (!freshnessSignal) {
    return true;
  }

  const signalTime = new Date(freshnessSignal).getTime();
  const operationTime = new Date(operationTimestamp).getTime();
  const freshnessWindowMs = freshnessWindowDays * 24 * 60 * 60 * 1000;

  return operationTime - signalTime > freshnessWindowMs;
}

function applyManualSideStateOverride(
  sideStates: Set<SourceSideState>,
  sideState: SourceSideState,
  mark: boolean,
  clear: boolean,
): void {
  if (mark) {
    sideStates.add(sideState);
  }

  if (clear) {
    sideStates.delete(sideState);
  }
}

function normalizeNullableText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function normalizeNullableTimestamp(value: string | undefined, label: string): string | null {
  const normalizedValue = normalizeNullableText(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedTimestamp = new Date(normalizedValue);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new Error(`${label} must be a valid ISO timestamp`);
  }

  return parsedTimestamp.toISOString();
}

function parseStatus(value: SourceStatus): SourceStatus {
  if (!SOURCE_STATUS_VALUES.includes(value)) {
    throw new Error(`status must be one of: ${SOURCE_STATUS_VALUES.join(", ")}`);
  }

  return value;
}

function parseCaptureKind(value: SourceCaptureKind): SourceCaptureKind {
  if (!SOURCE_CAPTURE_KIND_VALUES.includes(value)) {
    throw new Error(
      `captureKind must be one of: ${SOURCE_CAPTURE_KIND_VALUES.join(", ")}`,
    );
  }

  return value;
}
