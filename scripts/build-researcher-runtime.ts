import { buildResearcherRuntime } from "../internal/tools/researcher/runtime/build";

interface ParsedCliArguments {
  sourceProjectRoot: string;
  outputRoot?: string;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await buildResearcherRuntime({
    sourceProjectRoot: argumentsResult.sourceProjectRoot,
    outputRoot: argumentsResult.outputRoot,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--source-project-root":
        parsedArguments.sourceProjectRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--output-root":
        parsedArguments.outputRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    sourceProjectRoot: requireArgument(
      parsedArguments.sourceProjectRoot,
      "--source-project-root",
    ),
    outputRoot: parsedArguments.outputRoot,
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
  const message = error instanceof Error ? error.message : "Unknown runtime build error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
