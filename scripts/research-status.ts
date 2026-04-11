import { pathToFileURL } from "node:url";

import { summarizeResearchStatus } from "../internal/tools/researcher/core/status/summary";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
}

export async function runResearchStatusCli(argv: string[]): Promise<Awaited<ReturnType<typeof summarizeResearchStatus>>> {
  const argumentsResult = parseCliArguments(argv);

  return summarizeResearchStatus({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
  });
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {};

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
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    projectRoot: requireArgument(parsedArguments.projectRoot, "--project-root"),
    slug: requireArgument(parsedArguments.slug, "--slug"),
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

async function main(): Promise<void> {
  const result = await runResearchStatusCli(process.argv.slice(2));

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown research status error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
