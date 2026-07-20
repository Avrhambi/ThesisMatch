import type { SupervisionStatus } from "../types";

const DISQUALIFYING_PATTERN = /emeritus|\(ret\.?\)/i;

// Deterministic, not LLM-judged: the only structured data available is the
// free-text full_name from the BGU staff directory (see
// lib/repositories/researchers.ts), so eligibility is a name-string check,
// not a fact the model should be trusted to infer or invent.
export function detectSupervisionStatus(fullName: string): SupervisionStatus {
  return DISQUALIFYING_PATTERN.test(fullName) ? "unverified" : "verified_available";
}
