import type { GeminiResearcherReview } from "./evidenceValidation";
import type { MatchLevel, Priority } from "../types";

const LEVEL_RANK: Record<MatchLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

// The lowest of the four dimensions dominates -- each dimension is meant to
// be a necessary condition for a good thesis match, not an average, so one
// weak dimension (e.g. mechanismFit) is enough to cap the overall fit.
export function deriveOverallFit(
  review: Pick<GeminiResearcherReview, "topicFit" | "methodFit" | "mechanismFit" | "practicalFit">,
): MatchLevel {
  const levels: MatchLevel[] = [
    review.topicFit.level,
    review.methodFit.level,
    review.mechanismFit.level,
    review.practicalFit.level,
  ];
  return levels.reduce((min, level) => (LEVEL_RANK[level] < LEVEL_RANK[min] ? level : min));
}

// Deterministic, not LLM-judged: derived purely from overallFit and whether
// any concrete thesis direction was found -- the model is explicitly allowed
// to return an empty thesisDirections array (see researcherDeepAnalysis.ts)
// rather than restate the researcher's field as a filler "direction".
// supervisionStatus is intentionally not a factor here: "unverified" doesn't
// mean "bad research fit", it means the outreach gate should ask for
// confirmation, which is a separate concern (see supervisionEligibility.ts).
export function derivePriority(overallFit: MatchLevel, thesisDirectionsCount: number): Priority {
  if (overallFit === "high") return "high_priority";
  if (overallFit === "medium") return "consider";
  if (overallFit === "low") return thesisDirectionsCount > 0 ? "low_priority" : "do_not_prioritize";
  return "do_not_prioritize";
}
