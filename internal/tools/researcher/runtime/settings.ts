import {
  RESEARCHER_RUNTIME_MANAGED_ROOT,
  type RuntimeSettingsMergeRecord,
} from "../contracts/runtime";

import { RUNTIME_COMMAND_CATALOG } from "./catalog";

type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

export interface ClaudeSettingsPatch {
  researcher: {
    runtimeRoot: string;
    commands: string[];
  };
}

export interface ClaudeSettingsMergeResult {
  content: string;
  ownedKeys: string[];
  patch: ClaudeSettingsPatch;
}

export function createClaudeSettingsPatch(
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): ClaudeSettingsPatch {
  return {
    researcher: {
      runtimeRoot: managedRoot,
      commands: [...RUNTIME_COMMAND_CATALOG.map((entry) => entry.id)].sort(),
    },
  };
}

export function mergeClaudeSettingsDocument(
  existingDocument: string,
  patch = createClaudeSettingsPatch(),
): ClaudeSettingsMergeResult {
  const existingSettings = parseJsonObject(existingDocument);
  const nextSettings: JsonObject = {
    ...existingSettings,
    researcher: {
      ...(readNestedObject(existingSettings, "researcher") ?? {}),
      runtimeRoot: patch.researcher.runtimeRoot,
      commands: [...patch.researcher.commands],
    },
  };

  return {
    content: `${JSON.stringify(nextSettings, null, 2)}\n`,
    ownedKeys: ["researcher.runtimeRoot", "researcher.commands"],
    patch,
  };
}

export function createClaudeSettingsMergeRecord(
  updatedAt: string,
): RuntimeSettingsMergeRecord {
  return {
    path: ".claude/settings.local.json",
    owned_keys: ["researcher.runtimeRoot", "researcher.commands"],
    updated_at: updatedAt,
  };
}

export function createOptionalClaudeHookRecords(): RuntimeSettingsMergeRecord[] {
  return [];
}

function parseJsonObject(document: string): JsonObject {
  const trimmedDocument = document.trim();

  if (trimmedDocument.length === 0) {
    return {};
  }

  const parsedDocument = JSON.parse(trimmedDocument) as JsonValue;

  if (!isJsonObject(parsedDocument)) {
    throw new Error("Claude settings document must be a JSON object");
  }

  return parsedDocument;
}

function readNestedObject(input: JsonObject, key: string): JsonObject | null {
  const value = input[key];

  if (!isJsonObject(value)) {
    return null;
  }

  return value;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
