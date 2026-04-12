import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { chmod, cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import type {
  RuntimeCommandId,
  RuntimeManagedAssetKind,
  RuntimeSourceIdentity,
} from "../contracts/runtime";

const execFileAsync = promisify(execFile);

const RUNTIME_VENDOR_DEPENDENCIES = ["ajv", "ajv-formats", "gray-matter"] as const;

export const INSTALLED_RUNTIME_ENTRYPOINTS: Readonly<Record<RuntimeCommandId, string>> = {
  "research-new": "scripts/research-init.js",
  "research-harvest": "scripts/research-source-add.js",
  "research-refresh": "scripts/research-source-refresh.js",
  "research-insight": "scripts/research-insight.js",
  "research-analyze": "scripts/research-analysis.js",
  "research-report": "scripts/research-report.js",
  "research-status": "scripts/research-status.js",
  "research-resume": "scripts/research-resume.js",
  "research-update": "scripts/research-update.js",
  "research-inspect": "scripts/research-inspect.js",
} as const;

const ALL_INSTALLED_RUNTIME_COMMAND_IDS = Object.keys(
  INSTALLED_RUNTIME_ENTRYPOINTS,
) as RuntimeCommandId[];

export interface BuiltRuntimeAssetDefinition {
  relativePath: string;
  sourcePath: string;
  kind: RuntimeManagedAssetKind;
  commandIds: RuntimeCommandId[];
}

export interface BuildResearcherRuntimeInput {
  sourceProjectRoot: string;
  outputRoot?: string;
}

export interface BuildResearcherRuntimeResult {
  outputRoot: string;
  sourceIdentity: RuntimeSourceIdentity;
  builtAssets: BuiltRuntimeAssetDefinition[];
  entrypoints: Readonly<Record<RuntimeCommandId, string>>;
}

const buildCache = new Map<string, Promise<BuildResearcherRuntimeResult>>();

export async function buildResearcherRuntime(
  input: BuildResearcherRuntimeInput,
): Promise<BuildResearcherRuntimeResult> {
  const sourceProjectRoot = resolve(input.sourceProjectRoot);

  if (input.outputRoot) {
    return buildRuntimeDistribution({
      sourceProjectRoot,
      outputRoot: resolve(input.outputRoot),
    });
  }

  const cachedResult = buildCache.get(sourceProjectRoot);

  if (cachedResult) {
    return cachedResult;
  }

  const buildPromise = (async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "researcher-runtime-build-"));

    return buildRuntimeDistribution({
      sourceProjectRoot,
      outputRoot,
    });
  })();

  buildCache.set(sourceProjectRoot, buildPromise);

  try {
    return await buildPromise;
  } catch (error) {
    buildCache.delete(sourceProjectRoot);
    throw error;
  }
}

async function buildRuntimeDistribution(input: {
  sourceProjectRoot: string;
  outputRoot: string;
}): Promise<BuildResearcherRuntimeResult> {
  await rm(input.outputRoot, { force: true, recursive: true });
  await mkdir(input.outputRoot, { recursive: true });

  const sourceIdentity = await readSourceIdentity(input.sourceProjectRoot);

  await compileRuntimeSources(input.sourceProjectRoot, input.outputRoot);
  await rewriteCompiledImportSpecifiers(input.outputRoot);
  await copyRuntimeStaticAssets(input.sourceProjectRoot, input.outputRoot);
  const packageAssetPaths = await copyRuntimeDependencies(
    input.sourceProjectRoot,
    input.outputRoot,
  );
  await writeRuntimePackageBoundary(input.outputRoot, sourceIdentity.version);
  await writeRuntimeEntrypoints(input.outputRoot);

  return {
    outputRoot: input.outputRoot,
    sourceIdentity,
    builtAssets: [
      {
        relativePath: "bin",
        sourcePath: "internal/tools/researcher/runtime/build.ts",
        kind: "runtime-entry",
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      },
      {
        relativePath: "scripts",
        sourcePath: "scripts/research-*.ts",
        kind: "runtime-core",
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      },
      {
        relativePath: "internal/tools/researcher",
        sourcePath: "internal/tools/researcher",
        kind: "runtime-core",
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      },
      {
        relativePath: "researcher/schemas",
        sourcePath: "researcher/schemas",
        kind: "runtime-schema",
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      },
      {
        relativePath: "researcher/templates",
        sourcePath: "researcher/templates",
        kind: "runtime-template",
        commandIds: ["research-new"],
      },
      {
        relativePath: "package.json",
        sourcePath: "internal/tools/researcher/runtime/build.ts",
        kind: "runtime-package",
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      },
      ...packageAssetPaths.map((relativePath) => ({
        relativePath,
        sourcePath: relativePath,
        kind: "runtime-package" as const,
        commandIds: ALL_INSTALLED_RUNTIME_COMMAND_IDS,
      })),
    ],
    entrypoints: INSTALLED_RUNTIME_ENTRYPOINTS,
  };
}

async function readSourceIdentity(sourceProjectRoot: string): Promise<RuntimeSourceIdentity> {
  const packageDocument = JSON.parse(
    await readFile(join(sourceProjectRoot, "package.json"), "utf8"),
  ) as {
    version?: string;
  };

  return {
    version: packageDocument.version ?? "0.0.0",
    source_root: sourceProjectRoot,
  };
}

async function compileRuntimeSources(
  sourceProjectRoot: string,
  outputRoot: string,
): Promise<void> {
  const temporaryConfigPath = join(
    sourceProjectRoot,
    ".planning",
    "tmp",
    `researcher-runtime-${process.pid}.json`,
  );
  const configDirectory = dirname(temporaryConfigPath);
  const includeRoot = relative(configDirectory, sourceProjectRoot).replace(/\\/g, "/") || ".";

  await mkdir(dirname(temporaryConfigPath), { recursive: true });
  await writeFile(
    temporaryConfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          rootDir: sourceProjectRoot,
          outDir: outputRoot,
          resolveJsonModule: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          declaration: false,
          sourceMap: false,
          types: ["node"],
        },
        include: [
          `${includeRoot}/internal/tools/researcher/**/*.ts`,
          `${includeRoot}/scripts/research-*.ts`,
        ],
        exclude: [`${includeRoot}/internal/tools/researcher/__tests__/**/*.ts`],
      },
      null,
      2,
    ),
  );

  try {
    await execFileAsync(process.execPath, [
      join(sourceProjectRoot, "node_modules", "typescript", "bin", "tsc"),
      "--project",
      temporaryConfigPath,
    ]);
  } finally {
    await rm(temporaryConfigPath, { force: true });
  }
}

async function copyRuntimeStaticAssets(
  sourceProjectRoot: string,
  outputRoot: string,
): Promise<void> {
  await mkdir(join(outputRoot, "researcher"), { recursive: true });
  await cp(
    join(sourceProjectRoot, "researcher", "schemas"),
    join(outputRoot, "researcher", "schemas"),
    { recursive: true, dereference: true },
  );
  await cp(
    join(sourceProjectRoot, "researcher", "templates"),
    join(outputRoot, "researcher", "templates"),
    { recursive: true, dereference: true },
  );
}

async function copyRuntimeDependencies(
  sourceProjectRoot: string,
  outputRoot: string,
): Promise<string[]> {
  const outputNodeModulesRoot = join(outputRoot, "node_modules");
  const copiedPackages = new Set<string>();
  const assetPaths: string[] = [];
  const runtimeRequire = createRequire(join(sourceProjectRoot, "package.json"));

  await mkdir(outputNodeModulesRoot, { recursive: true });

  for (const packageName of RUNTIME_VENDOR_DEPENDENCIES) {
    await copyPackageTree(
      packageName,
      runtimeRequire,
      outputNodeModulesRoot,
      copiedPackages,
      assetPaths,
    );
  }

  return assetPaths.sort();
}

async function copyPackageTree(
  packageName: string,
  runtimeRequire: NodeRequire,
  outputNodeModulesRoot: string,
  copiedPackages: Set<string>,
  assetPaths: string[],
): Promise<void> {
  if (copiedPackages.has(packageName)) {
    return;
  }

  const sourcePackageJsonPath = runtimeRequire.resolve(`${packageName}/package.json`);
  const sourcePackageRoot = dirname(sourcePackageJsonPath);
  const outputPackageRoot = join(outputNodeModulesRoot, ...packageName.split("/"));
  const packageDocument = JSON.parse(
    await readFile(sourcePackageJsonPath, "utf8"),
  ) as {
    dependencies?: Record<string, string>;
  };

  await mkdir(dirname(outputPackageRoot), { recursive: true });
  await cp(sourcePackageRoot, outputPackageRoot, {
    recursive: true,
    force: true,
    dereference: true,
  });

  copiedPackages.add(packageName);
  assetPaths.push(join("node_modules", ...packageName.split("/")).replace(/\\/g, "/"));

  for (const dependencyName of Object.keys(packageDocument.dependencies ?? {})) {
    await copyPackageTree(
      dependencyName,
      runtimeRequire,
      outputNodeModulesRoot,
      copiedPackages,
      assetPaths,
    );
  }
}

async function writeRuntimePackageBoundary(
  outputRoot: string,
  version: string,
): Promise<void> {
  await writeFile(
    join(outputRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "researcher-runtime",
        private: true,
        type: "module",
        version,
      },
      null,
      2,
    )}\n`,
  );
}

async function writeRuntimeEntrypoints(outputRoot: string): Promise<void> {
  const binRoot = join(outputRoot, "bin");
  await mkdir(binRoot, { recursive: true });

  for (const [commandId, scriptPath] of Object.entries(INSTALLED_RUNTIME_ENTRYPOINTS) as Array<
    [RuntimeCommandId, string]
  >) {
    const entrypointPath = join(binRoot, `${commandId}.js`);
    const relativeImportPath = `../${scriptPath.replace(/\\/g, "/")}`;

    await writeFile(
      entrypointPath,
      `#!/usr/bin/env node\nimport "${relativeImportPath}";\n`,
    );
    await chmod(entrypointPath, 0o755);
  }
}

async function rewriteCompiledImportSpecifiers(outputRoot: string): Promise<void> {
  const rootsToRewrite = [join(outputRoot, "internal"), join(outputRoot, "scripts")];

  for (const rootPath of rootsToRewrite) {
    if (!(await pathExists(rootPath))) {
      continue;
    }

    await rewriteDirectoryImports(rootPath);
  }
}

async function rewriteDirectoryImports(directoryPath: string): Promise<void> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const targetPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await rewriteDirectoryImports(targetPath);
      continue;
    }

    if (!entry.isFile() || !targetPath.endsWith(".js")) {
      continue;
    }

    const document = await readFile(targetPath, "utf8");
    const rewrittenDocument = rewriteImportSpecifiers(document);

    if (rewrittenDocument !== document) {
      await writeFile(targetPath, rewrittenDocument, "utf8");
    }
  }
}

function rewriteImportSpecifiers(document: string): string {
  return document
    .replace(
      /(from\s+["'])(\.[^"']+)(["'])/g,
      (_match, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${normalizeCompiledSpecifier(specifier)}${suffix}`,
    )
    .replace(
      /(import\s+["'])(\.[^"']+)(["'])/g,
      (_match, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${normalizeCompiledSpecifier(specifier)}${suffix}`,
    )
    .replace(
      /(import\(\s*["'])(\.[^"']+)(["']\s*\))/g,
      (_match, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${normalizeCompiledSpecifier(specifier)}${suffix}`,
    );
}

function normalizeCompiledSpecifier(specifier: string): string {
  if (/\.(?:cjs|js|json|mjs)$/.test(specifier)) {
    return specifier;
  }

  return `${specifier}.js`;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await readFile(targetPath);
    return true;
  } catch {
    try {
      await readdir(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
