import { createResearchId } from "../contracts/manifest";

export function createWorkspaceResearchId(slug: string, now: Date = new Date()): string {
  return createResearchId(slug, now);
}
