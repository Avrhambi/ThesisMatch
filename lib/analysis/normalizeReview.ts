import type { CvRecommendation, GeminiResearcherReview, PaperReview } from "./evidenceValidation";

// The Gemini response schema (lib/gemini/schema.ts) uses "" instead of JSON
// null for "not stated" fields; this converts back to the null the app's
// domain types (and SCHEMA.md's PaperReview) expect.
function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function normalizePaperReview(raw: {
  paperId: string;
  question: string;
  method: string;
  results: string;
  keyConcepts: string[];
  limitations: string[];
  fit: PaperReview["fit"];
  thesisPotential: PaperReview["thesisPotential"];
  evidence: PaperReview["evidence"];
}): PaperReview {
  return {
    paperId: raw.paperId,
    question: emptyToNull(raw.question),
    method: emptyToNull(raw.method),
    results: emptyToNull(raw.results),
    keyConcepts: raw.keyConcepts,
    limitations: raw.limitations,
    fit: raw.fit,
    thesisPotential: raw.thesisPotential,
    evidence: raw.evidence,
  };
}

export function normalizeResearcherReview(
  raw: Omit<GeminiResearcherReview, "papers"> & { papers: Parameters<typeof normalizePaperReview>[0][] },
): GeminiResearcherReview {
  return { ...raw, papers: raw.papers.map(normalizePaperReview) };
}

export function normalizeCvRecommendation(raw: {
  type: CvRecommendation["type"];
  section: string;
  currentText: string;
  suggestedText: string;
  reason: string;
  evidenceIds: string[];
}): CvRecommendation {
  return {
    type: raw.type,
    section: raw.section,
    currentText: emptyToNull(raw.currentText),
    suggestedText: emptyToNull(raw.suggestedText),
    reason: raw.reason,
    evidenceIds: raw.evidenceIds,
  };
}
