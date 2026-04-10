import { initResearchWorkspace } from "../internal/tools/researcher/core/init";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  title: string;
  question: string;
  audience?: string;
  tags: string[];
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await initResearchWorkspace({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    title: argumentsResult.title,
    question: argumentsResult.question,
    audience: argumentsResult.audience,
    tags: argumentsResult.tags,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function parseCliArguments(argv: string[]): ParsedCliArguments {
  const parsedArguments: Partial<ParsedCliArguments> = {
    tags: [],
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
      case "--title":
        parsedArguments.title = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--question":
        parsedArguments.question = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--audience":
        parsedArguments.audience = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--tag":
        parsedArguments.tags?.push(readFlagValue(argv, index, argument));
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
    question: requireArgument(parsedArguments.question, "--question"),
    audience: parsedArguments.audience,
    tags: parsedArguments.tags ?? [],
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
  const message = error instanceof Error ? error.message : "Unknown research init error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
