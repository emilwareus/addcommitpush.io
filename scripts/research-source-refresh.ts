import {
  refreshSource,
  type RefreshSourceInput,
} from "../internal/tools/researcher/core/sources/refresh";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  sourceId?: string;
  canonicalUrl?: string;
  status?: RefreshSourceInput["status"];
  accessedAt?: string;
  lastCheckedAt?: string;
  captureKind?: RefreshSourceInput["captureKind"];
  captureFile?: string;
  capturedAt?: string;
  markStale: boolean;
  clearStale: boolean;
  markSuperseded: boolean;
  clearSuperseded: boolean;
  markRejected: boolean;
  clearRejected: boolean;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await refreshSource({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    sourceId: argumentsResult.sourceId,
    canonicalUrl: argumentsResult.canonicalUrl,
    status: argumentsResult.status,
    accessedAt: argumentsResult.accessedAt,
    lastCheckedAt: argumentsResult.lastCheckedAt,
    captureKind: argumentsResult.captureKind,
    captureFile: argumentsResult.captureFile,
    capturedAt: argumentsResult.capturedAt,
    markStale: argumentsResult.markStale,
    clearStale: argumentsResult.clearStale,
    markSuperseded: argumentsResult.markSuperseded,
    clearSuperseded: argumentsResult.clearSuperseded,
    markRejected: argumentsResult.markRejected,
    clearRejected: argumentsResult.clearRejected,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: ParsedCliArguments = {
    projectRoot: "",
    slug: "",
    markStale: false,
    clearStale: false,
    markSuperseded: false,
    clearSuperseded: false,
    markRejected: false,
    clearRejected: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--project-root":
        parsedArguments.projectRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--slug":
        parsedArguments.slug = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--source-id":
        parsedArguments.sourceId = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--canonical-url":
        parsedArguments.canonicalUrl = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--status":
        parsedArguments.status = readFlagValue(
          argv,
          index,
          argument,
        ) as RefreshSourceInput["status"];
        index += 1;
        break;
      case "--accessed-at":
        parsedArguments.accessedAt = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--last-checked-at":
        parsedArguments.lastCheckedAt = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--capture-kind":
        parsedArguments.captureKind = readFlagValue(
          argv,
          index,
          argument,
        ) as RefreshSourceInput["captureKind"];
        index += 1;
        break;
      case "--capture-file":
        parsedArguments.captureFile = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--captured-at":
        parsedArguments.capturedAt = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--mark-stale":
        parsedArguments.markStale = true;
        break;
      case "--clear-stale":
        parsedArguments.clearStale = true;
        break;
      case "--mark-superseded":
        parsedArguments.markSuperseded = true;
        break;
      case "--clear-superseded":
        parsedArguments.clearSuperseded = true;
        break;
      case "--mark-rejected":
        parsedArguments.markRejected = true;
        break;
      case "--clear-rejected":
        parsedArguments.clearRejected = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    projectRoot: requireArgument(parsedArguments.projectRoot, "--project-root"),
    slug: requireArgument(parsedArguments.slug, "--slug"),
    sourceId: normalizeOptionalArgument(parsedArguments.sourceId),
    canonicalUrl: normalizeOptionalArgument(parsedArguments.canonicalUrl),
    status: parsedArguments.status,
    accessedAt: parsedArguments.accessedAt,
    lastCheckedAt: parsedArguments.lastCheckedAt,
    captureKind: parsedArguments.captureKind,
    captureFile: parsedArguments.captureFile,
    capturedAt: parsedArguments.capturedAt,
    markStale: parsedArguments.markStale,
    clearStale: parsedArguments.clearStale,
    markSuperseded: parsedArguments.markSuperseded,
    clearSuperseded: parsedArguments.clearSuperseded,
    markRejected: parsedArguments.markRejected,
    clearRejected: parsedArguments.clearRejected,
  };
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function requireArgument(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Missing required argument ${flag}`);
  }

  return value;
}

function normalizeOptionalArgument(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? undefined : normalizedValue;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research source refresh error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
