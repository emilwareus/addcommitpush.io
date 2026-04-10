import {
  SOURCE_CONFIDENCE_VALUES,
  SOURCE_ORIGIN_TYPE_VALUES,
  SOURCE_STATUS_VALUES,
  SOURCE_TYPE_VALUES,
  type SourceConfidence,
  type SourceOrigin,
  type SourceStatus,
  type SourceType,
} from "../../contracts/sources";

import {
  allocateSourceId,
  loadSourceStore,
  persistSourceStore,
  syncSourceManifestState,
} from "./store";
import { normalizeCanonicalUrl } from "./normalize";

export interface AddSourceInput {
  projectRoot: string;
  slug: string;
  title: string;
  url: string;
  type: SourceType;
  origin: SourceOrigin;
  canonicalUrl?: string;
  confidence?: SourceConfidence;
  status?: SourceStatus;
  tags?: string[];
  publishedAt?: string;
  accessedAt?: string;
  lastCheckedAt?: string;
  notes?: string;
  now?: Date;
}

export interface AddSourceResult {
  operation: "created" | "updated";
  sourceId: string;
  canonicalUrl: string;
}

export async function addSource(input: AddSourceInput): Promise<AddSourceResult> {
  const normalizedInput = normalizeAddSourceInput(input);
  const store = await loadSourceStore(normalizedInput);
  const operationTimestamp = normalizedInput.now.toISOString();
  const existingSource = store.sources.sources.find(
    (source) => source.canonical_url === normalizedInput.canonicalUrl,
  );

  if (existingSource) {
    existingSource.title = normalizedInput.title;
    existingSource.url = normalizedInput.url;
    existingSource.canonical_url = normalizedInput.canonicalUrl;
    existingSource.origin = normalizedInput.origin;
    existingSource.type = normalizedInput.type;
    existingSource.confidence = normalizedInput.confidence;
    existingSource.status = normalizedInput.status;
    existingSource.published_at = normalizedInput.publishedAt;
    existingSource.updated_at = operationTimestamp;
    existingSource.accessed_at = normalizedInput.accessedAt;
    existingSource.last_checked_at = normalizedInput.lastCheckedAt;
    existingSource.tags = normalizedInput.tags;
    existingSource.notes = normalizedInput.notes;
    store.sources.updated_at = operationTimestamp;
    syncSourceManifestState(store.manifest, store.sources, operationTimestamp);
    await persistSourceStore(store);

    return {
      operation: "updated",
      sourceId: existingSource.id,
      canonicalUrl: existingSource.canonical_url,
    };
  }

  const sourceId = allocateSourceId(store.manifest);

  store.sources.sources.push({
    id: sourceId,
    title: normalizedInput.title,
    url: normalizedInput.url,
    canonical_url: normalizedInput.canonicalUrl,
    origin: normalizedInput.origin,
    type: normalizedInput.type,
    confidence: normalizedInput.confidence,
    status: normalizedInput.status,
    side_states: [],
    published_at: normalizedInput.publishedAt,
    created_at: operationTimestamp,
    updated_at: operationTimestamp,
    accessed_at: normalizedInput.accessedAt,
    last_checked_at: normalizedInput.lastCheckedAt,
    latest_capture_path: null,
    captures: [],
    linked_insights: [],
    tags: normalizedInput.tags,
    notes: normalizedInput.notes,
  });
  store.sources.updated_at = operationTimestamp;
  store.manifest.next_ids.source += 1;
  syncSourceManifestState(store.manifest, store.sources, operationTimestamp);
  await persistSourceStore(store);

  return {
    operation: "created",
    sourceId,
    canonicalUrl: normalizedInput.canonicalUrl,
  };
}

interface NormalizedAddSourceInput {
  projectRoot: string;
  slug: string;
  title: string;
  url: string;
  canonicalUrl: string;
  type: SourceType;
  origin: SourceOrigin;
  confidence: SourceConfidence;
  status: SourceStatus;
  publishedAt: string | null;
  accessedAt: string;
  lastCheckedAt: string;
  tags: string[];
  notes: string | null;
  now: Date;
}

function normalizeAddSourceInput(input: AddSourceInput): NormalizedAddSourceInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const url = input.url.trim();
  const now = input.now ?? new Date();

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  if (title.length === 0) {
    throw new Error("title is required");
  }

  if (url.length === 0) {
    throw new Error("url is required");
  }

  const canonicalUrl = normalizeCanonicalUrl(input.canonicalUrl ?? url);
  const timestamp = now.toISOString();

  return {
    projectRoot,
    slug,
    title,
    url,
    canonicalUrl,
    type: parseEnumValue("type", input.type, SOURCE_TYPE_VALUES),
    origin: normalizeSourceOrigin(input.origin),
    confidence: parseEnumValue(
      "confidence",
      input.confidence ?? "unknown",
      SOURCE_CONFIDENCE_VALUES,
    ),
    status: parseEnumValue("status", input.status ?? "queued", SOURCE_STATUS_VALUES),
    publishedAt: normalizeNullableText(input.publishedAt),
    accessedAt: normalizeNullableText(input.accessedAt) ?? timestamp,
    lastCheckedAt: normalizeNullableText(input.lastCheckedAt) ?? timestamp,
    tags: normalizeTags(input.tags),
    notes: normalizeNullableText(input.notes),
    now,
  };
}

function normalizeSourceOrigin(origin: SourceOrigin): SourceOrigin {
  return {
    type: parseEnumValue("origin.type", origin.type, SOURCE_ORIGIN_TYPE_VALUES),
    value: requireNonEmptyText(origin.value, "origin.value"),
  };
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

function normalizeNullableText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function requireNonEmptyText(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required`);
  }

  return normalizedValue;
}

function parseEnumValue<T extends string>(
  label: string,
  value: string,
  allowedValues: readonly T[],
): T {
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${label} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as T;
}
