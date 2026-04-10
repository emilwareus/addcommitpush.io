import { addSource, type AddSourceInput } from "../internal/tools/researcher/core/sources/add";

interface ParsedCliArguments {
  projectRoot: string;
  slug: string;
  title: string;
  url: string;
  type: AddSourceInput["type"];
  originType: AddSourceInput["origin"]["type"];
  originValue: string;
  canonicalUrl?: string;
  confidence?: AddSourceInput["confidence"];
  status?: AddSourceInput["status"];
  tags: string[];
  publishedAt?: string;
  accessedAt?: string;
  lastCheckedAt?: string;
  notes?: string;
}

async function main(): Promise<void> {
  const argumentsResult = parseCliArguments(process.argv.slice(2));
  const result = await addSource({
    projectRoot: argumentsResult.projectRoot,
    slug: argumentsResult.slug,
    title: argumentsResult.title,
    url: argumentsResult.url,
    canonicalUrl: argumentsResult.canonicalUrl,
    type: argumentsResult.type,
    origin: {
      type: argumentsResult.originType,
      value: argumentsResult.originValue,
    },
    confidence: argumentsResult.confidence,
    status: argumentsResult.status,
    tags: argumentsResult.tags,
    publishedAt: argumentsResult.publishedAt,
    accessedAt: argumentsResult.accessedAt,
    lastCheckedAt: argumentsResult.lastCheckedAt,
    notes: argumentsResult.notes,
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
      case "--url":
        parsedArguments.url = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--type":
        parsedArguments.type = readFlagValue(
          argv,
          index,
          argument,
        ) as ParsedCliArguments["type"];
        index += 1;
        break;
      case "--origin-type":
        parsedArguments.originType = readFlagValue(
          argv,
          index,
          argument,
        ) as ParsedCliArguments["originType"];
        index += 1;
        break;
      case "--origin-value":
        parsedArguments.originValue = readFlagValue(argv, index, argument);
        index += 1;
        break;
      case "--canonical-url":
        parsedArguments.canonicalUrl = readFlagValue(argv, index, argument);
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
      case "--status":
        parsedArguments.status = readFlagValue(
          argv,
          index,
          argument,
        ) as ParsedCliArguments["status"];
        index += 1;
        break;
      case "--tag":
        parsedArguments.tags?.push(readFlagValue(argv, index, argument));
        index += 1;
        break;
      case "--published-at":
        parsedArguments.publishedAt = readFlagValue(argv, index, argument);
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
      case "--notes":
        parsedArguments.notes = readFlagValue(argv, index, argument);
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
    url: requireArgument(parsedArguments.url, "--url"),
    type: requireTypedArgument(parsedArguments.type, "--type"),
    originType: requireTypedArgument(parsedArguments.originType, "--origin-type"),
    originValue: requireArgument(parsedArguments.originValue, "--origin-value"),
    canonicalUrl: parsedArguments.canonicalUrl,
    confidence: parsedArguments.confidence,
    status: parsedArguments.status,
    tags: parsedArguments.tags ?? [],
    publishedAt: parsedArguments.publishedAt,
    accessedAt: parsedArguments.accessedAt,
    lastCheckedAt: parsedArguments.lastCheckedAt,
    notes: parsedArguments.notes,
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

function requireTypedArgument<T extends string>(value: T | undefined, flag: string): T {
  if (!value) {
    throw new Error(`Missing required argument ${flag}`);
  }

  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research source add error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
