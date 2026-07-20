import type { AccessLevel } from "../types";

export function decideAccessLevel(input: { isOpenAccess: boolean; hasAbstract: boolean }): AccessLevel {
  if (input.isOpenAccess) return "full_text_open";
  if (input.hasAbstract) return "abstract";
  return "metadata_only";
}
