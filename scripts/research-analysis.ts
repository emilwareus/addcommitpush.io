import { upsertAnalysis } from "../internal/tools/researcher/core/analysis/upsert";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  title: string;
  analysisId?: string;
  status?: "draft" | "validated" | "disputed" | "superseded";
  confidence?: "high" | "medium" | "low" | "unknown";
  insightIds: string[];
  tags: string[];
  transitionalScaffold: boolean;
  question: string;
  synthesis: string;
  contradictions: string[];
  caveats: string[];
  openQuestions: string[];
  nextMoves: string[];
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await upsertAnalysis({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    title: argumentsResult.title,
    analysisId: argumentsResult.analysisId,
    status: argumentsResult.status,
    confidence: argumentsResult.confidence,
    insightIds: argumentsResult.insightIds,
    tags: argumentsResult.tags,
    transitionalScaffold: argumentsResult.transitionalScaffold,
    question: argumentsResult.question,
    synthesis: argumentsResult.synthesis,
    contradictions: argumentsResult.contradictions,
    caveats: argumentsResult.caveats,
    openQuestions: argumentsResult.openQuestions,
    nextMoves: argumentsResult.nextMoves,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {
    insightIds: [],
    tags: [],
    contradictions: [],
    caveats: [],
    openQuestions: [],
    nextMoves: [],
    transitionalScaffold: false,
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
      case "--analysis-id":
        parsedArguments.analysisId = readFlagValue(argv, index, argument);
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
      case "--insight-id":
        parsedArguments.insightIds?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--tag":
        parsedArguments.tags?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--transitional-scaffold":
        parsedArguments.transitionalScaffold = true;
        break;
      case "--question":
        parsedArguments.question = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--synthesis":
        parsedArguments.synthesis = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--contradiction":
        parsedArguments.contradictions?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--caveat":
        parsedArguments.caveats?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--open-question":
        parsedArguments.openQuestions?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--next-move":
        parsedArguments.nextMoves?.push(readFlagValue(argv, index, argument));
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
    analysisId: parsedArguments.analysisId,
    status: parsedArguments.status,
    confidence: parsedArguments.confidence,
    insightIds: parsedArguments.insightIds ?? [],
    tags: parsedArguments.tags ?? [],
    transitionalScaffold: Boolean(parsedArguments.transitionalScaffold),
    question: requireArgument(parsedArguments.question, "--question"),
    synthesis: requireArgument(parsedArguments.synthesis, "--synthesis"),
    contradictions: parsedArguments.contradictions ?? [],
    caveats: parsedArguments.caveats ?? [],
    openQuestions: parsedArguments.openQuestions ?? [],
    nextMoves: parsedArguments.nextMoves ?? [],
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
  const message = error instanceof Error ? error.message : "Unknown research analysis error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
