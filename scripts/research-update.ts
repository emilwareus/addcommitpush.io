import { updateResearcherRuntime } from "../internal/tools/researcher/runtime/update";

interface ParsedCliArguments {
  sourceProjectRoot: string;
  targetProjectRoot: string;
  runtime: "codex" | "claude";
  managedRoot?: string;
  includeOptionalHooks: boolean;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await updateResearcherRuntime({
    sourceProjectRoot: argumentsResult.sourceProjectRoot,
    targetProjectRoot: argumentsResult.targetProjectRoot,
    runtime: argumentsResult.runtime,
    managedRoot: argumentsResult.managedRoot,
    includeOptionalHooks: argumentsResult.includeOptionalHooks,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {
    includeOptionalHooks: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--source-project-root":
        parsedArguments.sourceProjectRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--target-project-root":
        parsedArguments.targetProjectRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--runtime":
        parsedArguments.runtime = readFlagValue(argv, index, argument) as ParsedCliArguments["runtime"];
        index += 1;
        break;
      case "--managed-root":
        parsedArguments.managedRoot = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--include-optional-hooks":
        parsedArguments.includeOptionalHooks = true;
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
    targetProjectRoot: requireArgument(
      parsedArguments.targetProjectRoot,
      "--target-project-root",
    ),
    runtime: requireArgument(parsedArguments.runtime, "--runtime") as ParsedCliArguments["runtime"],
    managedRoot: parsedArguments.managedRoot,
    includeOptionalHooks: parsedArguments.includeOptionalHooks ?? false,
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
  const message = error instanceof Error ? error.message : "Unknown runtime update error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
