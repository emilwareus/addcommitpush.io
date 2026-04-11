import { upsertInsight } from "../internal/tools/researcher/core/insights/upsert";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  title: string;
  status?: "draft" | "validated" | "disputed" | "superseded";
  confidence?: "high" | "medium" | "low" | "unknown";
  insightId?: string;
  sourceIds: string[];
  tags: string[];
  claim: string;
  whyItMatters: string;
  evidence: Array<{ sourceId: string; note: string }>;
  caveats: string[];
  reuseNotes: string;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await upsertInsight({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    title: argumentsResult.title,
    status: argumentsResult.status,
    confidence: argumentsResult.confidence,
    tags: argumentsResult.tags,
    insightId: argumentsResult.insightId,
    sourceIds: argumentsResult.sourceIds,
    claim: argumentsResult.claim,
    whyItMatters: argumentsResult.whyItMatters,
    evidence: argumentsResult.evidence,
    caveats: argumentsResult.caveats,
    reuseNotes: argumentsResult.reuseNotes,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {
    tags: [],
    sourceIds: [],
    evidence: [],
    caveats: [],
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
      case "--insight-id":
        parsedArguments.insightId = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--title":
        parsedArguments.title = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--status":
        parsedArguments.status = readFlagValue(argv, index, argument) as ParsedCliArguments["status"];
        index += 1;
        break;
      case "--confidence":
        parsedArguments.confidence = readFlagValue(
          argv,
          index,
          argument,
        ) as ParsedCliArguments["confidence"];
        index += 1;
        break;
      case "--source-id":
        parsedArguments.sourceIds?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--tag":
        parsedArguments.tags?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--claim":
        parsedArguments.claim = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--why-it-matters":
        parsedArguments.whyItMatters = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--evidence":
        parsedArguments.evidence?.push(parseEvidenceFlag(readFlagValue(argv, index, argument)));
        index += 1;
        break;
      case "--caveat":
        parsedArguments.caveats?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--reuse-notes":
        parsedArguments.reuseNotes = readFlagValue(argv, index, argument);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    projectRoot: requireArgument(parsedArguments.projectRoot, "--project-root"),
    slug: requireArgument(parsedArguments.slug, "--slug"),
    title: requireArgument(parsedArguments.title, "--title"),
    status: parsedArguments.status,
    confidence: parsedArguments.confidence,
    insightId: parsedArguments.insightId,
    sourceIds: parsedArguments.sourceIds ?? [],
    tags: parsedArguments.tags ?? [],
    claim: requireArgument(parsedArguments.claim, "--claim"),
    whyItMatters: requireArgument(parsedArguments.whyItMatters, "--why-it-matters"),
    evidence: parsedArguments.evidence ?? [],
    caveats: parsedArguments.caveats ?? [],
    reuseNotes: requireArgument(parsedArguments.reuseNotes, "--reuse-notes"),
  };
}

function parseEvidenceFlag(value: string): { sourceId: string; note: string } {
  const separatorIndex = value.indexOf("::");

  if (separatorIndex < 0) {
    throw new Error("--evidence must use SRC-0001::support note");
  }

  const sourceId = value.slice(0, separatorIndex).trim();
  const note = value.slice(separatorIndex + 2).trim();

  if (sourceId.length === 0 || note.length === 0) {
    throw new Error("--evidence must use SRC-0001::support note");
  }

  return {
    sourceId,
    note,
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research insight error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
