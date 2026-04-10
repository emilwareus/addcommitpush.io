import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TemporaryWorkspace {
  cleanup: () => Promise<void>;
  rootDir: string;
}

export async function createTemporaryWorkspace(
  prefix = "researcher-spec-",
): Promise<TemporaryWorkspace> {
  const rootDir = await mkdtemp(join(tmpdir(), prefix));

  return {
    rootDir,
    cleanup: async () => {
      await removeTemporaryWorkspace(rootDir);
    },
  };
}

export async function removeTemporaryWorkspace(rootDir: string): Promise<void> {
  await rm(rootDir, { force: true, recursive: true });
}
