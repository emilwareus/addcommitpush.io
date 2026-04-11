import { upsertReport } from "../internal/tools/researcher/core/reports/upsert";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  title: string;
  reportId?: string;
  audience: string;
  angle: string;
  thesis: string;
  status?: "draft" | "validated" | "disputed" | "superseded";
  analysisIds: string[];
  insightIds: string[];
  freshAsOf?: string;
  summary: string;
  keyPoints: string[];
  body: string;
  limitations: string[];
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await upsertReport({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    title: argumentsResult.title,
    reportId: argumentsResult.reportId,
    audience: argumentsResult.audience,
    angle: argumentsResult.angle,
    thesis: argumentsResult.thesis,
    status: argumentsResult.status,
    analysisIds: argumentsResult.analysisIds,
    insightIds: argumentsResult.insightIds,
    freshAsOf: argumentsResult.freshAsOf,
    summary: argumentsResult.summary,
    keyPoints: argumentsResult.keyPoints,
    body: argumentsResult.body,
    limitations: argumentsResult.limitations,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {
    analysisIds: [],
    insightIds: [],
    keyPoints: [],
    limitations: [],
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
      case "--report-id":
        parsedArguments.reportId = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--title":
        parsedArguments.title = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--audience":
        parsedArguments.audience = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--angle":
        parsedArguments.angle = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--thesis":
        parsedArguments.thesis = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--status":
        parsedArguments.status = readFlagValue(argv, index, argument) as ParsedCliArguments["status"];
        index += 1;
        break;
      case "--analysis-id":
        parsedArguments.analysisIds?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--insight-id":
        parsedArguments.insightIds?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--fresh-as-of":
        parsedArguments.freshAsOf = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--summary":
        parsedArguments.summary = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--key-point":
        parsedArguments.keyPoints?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--body":
        parsedArguments.body = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--limitation":
        parsedArguments.limitations?.push(readFlagValue(argv, index, argument));
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
    reportId: parsedArguments.reportId,
    audience: requireArgument(parsedArguments.audience, "--audience"),
    angle: requireArgument(parsedArguments.angle, "--angle"),
    thesis: requireArgument(parsedArguments.thesis, "--thesis"),
    status: parsedArguments.status,
    analysisIds: parsedArguments.analysisIds ?? [],
    insightIds: parsedArguments.insightIds ?? [],
    freshAsOf: parsedArguments.freshAsOf,
    summary: requireArgument(parsedArguments.summary, "--summary"),
    keyPoints: parsedArguments.keyPoints ?? [],
    body: requireArgument(parsedArguments.body, "--body"),
    limitations: parsedArguments.limitations ?? [],
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
  const message = error instanceof Error ? error.message : "Unknown research report error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
