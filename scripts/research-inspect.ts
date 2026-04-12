import { inspectResearcherRuntimeInstallation } from "../internal/tools/researcher/runtime/inspect";

interface ParsedCliArguments {
  targetProjectRoot: string;
  managedRoot?: string;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await inspectResearcherRuntimeInstallation({
    targetProjectRoot: argumentsResult.targetProjectRoot,
    managedRoot: argumentsResult.managedRoot,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--target-project-root":
        parsedArguments.targetProjectRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--managed-root":
        parsedArguments.managedRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    targetProjectRoot: requireArgument(
      parsedArguments.targetProjectRoot,
      "--target-project-root",
    ),
    managedRoot: parsedArguments.managedRoot,
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
  const message = error instanceof Error ? error.message : "Unknown runtime inspect error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
