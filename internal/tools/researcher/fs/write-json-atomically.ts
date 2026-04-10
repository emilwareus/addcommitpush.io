import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { rename, rm, writeFile } from "node:fs/promises";

export async function writeJsonAtomically(targetPath: string, value: unknown): Promise<void> {
  const temporaryPath = join(dirname(targetPath), `.${randomUUID()}.tmp`);
  const serializedValue = `${JSON.stringify(value, null, 2)}\n`;

  try {
    await writeFile(temporaryPath, serializedValue, "utf8");
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
