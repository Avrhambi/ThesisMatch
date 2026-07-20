import { describe, expect, it } from "vitest";
import {
  validateCvRecommendationsEvidence,
  validatePaperReviewsEvidence,
  validateResearcherReviewEvidence,
  type CvRecommendation,
  type GeminiResearcherReview,
  type PaperReview,
} from "../../lib/analysis/evidenceValidation";

function makePaperReview(overrides: Partial<PaperReview> = {}): PaperReview {
  return {
    paperId: "paper-1",
    question: "What is the research question?",
    method: "A method",
    results: "Some results",
    limitations: [],
    fit: "high",
    thesisPotential: "high",
    evidence: [{ sourceId: "source-1", label: "Crossref", access: "abstract" }],
    ...overrides,
  };
}

describe("validatePaperReviewsEvidence", () => {
  it("keeps evidence whose sourceId is in the allowed set and marks factual claims verified", () => {
    const { sanitizedPapers, claims, hasGaps } = validatePaperReviewsEvidence(
      [makePaperReview()],
      new Set(["source-1"]),
    );
    expect(sanitizedPapers[0].evidence).toHaveLength(1);
    expect(hasGaps).toBe(false);
    expect(claims.every((c) => c.status === "verified")).toBe(true);
    expect(claims).toHaveLength(3);
  });

  it("strips evidence citing a sourceId outside the allowed set and flags gaps", () => {
    const { sanitizedPapers, hasGaps } = validatePaperReviewsEvidence(
      [makePaperReview({ evidence: [{ sourceId: "not-allowed", label: "x", access: "abstract" }] })],
      new Set(["source-1"]),
    );
    expect(sanitizedPapers[0].evidence).toHaveLength(0);
    expect(hasGaps).toBe(true);
  });

  it("marks factual fields missing when no evidence backs them, and flags gaps", () => {
    const { claims, hasGaps } = validatePaperReviewsEvidence(
      [makePaperReview({ evidence: [] })],
      new Set(["source-1"]),
    );
    expect(hasGaps).toBe(true);
    expect(claims.every((c) => c.status === "missing")).toBe(true);
    expect(claims.every((c) => c.evidenceSourceIds.length === 0)).toBe(true);
  });

  it("does not emit a claim for a field that is null", () => {
    const { claims } = validatePaperReviewsEvidence(
      [makePaperReview({ method: null, results: null })],
      new Set(["source-1"]),
    );
    expect(claims).toHaveLength(1);
    expect(claims[0].claimType).toBe("paper_question");
  });
});

describe("validateResearcherReviewEvidence", () => {
  it("sanitizes every paper review inside the researcher review", () => {
    const review: GeminiResearcherReview = {
      summary: "summary",
      topics: [],
      industryOrientation: "unknown",
      technicalOrientation: "unknown",
      topicFit: { level: "medium", reasoning: "test" },
      methodFit: { level: "medium", reasoning: "test" },
      mechanismFit: { level: "medium", reasoning: "test" },
      practicalFit: { level: "medium", reasoning: "test" },
      recommendationReason: "test",
      disqualifyingFactors: [],
      missingEvidence: [],
      matches: [],
      mismatches: [],
      thesisDirections: [],
      papers: [makePaperReview({ evidence: [{ sourceId: "not-allowed", label: "x", access: "abstract" }] })],
    };
    const { sanitized, hasGaps } = validateResearcherReviewEvidence(review, new Set(["source-1"]));
    expect(sanitized.papers[0].evidence).toHaveLength(0);
    expect(hasGaps).toBe(true);
  });
});

function makeCvRecommendation(overrides: Partial<CvRecommendation> = {}): CvRecommendation {
  return {
    type: "emphasize",
    section: "Experience",
    currentText: "old text",
    suggestedText: "new text",
    reason: "matches researcher's focus area",
    evidenceIds: ["source-1"],
    ...overrides,
  };
}

describe("validateCvRecommendationsEvidence", () => {
  it("keeps evidenceIds within the allowed set and marks the claim verified", () => {
    const { sanitized, claims, hasGaps } = validateCvRecommendationsEvidence(
      [makeCvRecommendation()],
      new Set(["source-1"]),
    );
    expect(sanitized[0].evidenceIds).toEqual(["source-1"]);
    expect(hasGaps).toBe(false);
    expect(claims[0].status).toBe("verified");
  });

  it("drops a non-missing_evidence recommendation left with no surviving evidence, and flags a gap", () => {
    const { sanitized, dropped, claims, hasGaps } = validateCvRecommendationsEvidence(
      [makeCvRecommendation({ evidenceIds: ["not-allowed"] })],
      new Set(["source-1"]),
    );
    expect(sanitized).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(claims).toHaveLength(0);
    expect(hasGaps).toBe(true);
  });

  it("drops a non-missing_evidence recommendation given no evidence at all, and flags a gap", () => {
    const { sanitized, dropped, hasGaps } = validateCvRecommendationsEvidence(
      [makeCvRecommendation({ evidenceIds: [] })],
      new Set(["source-1"]),
    );
    expect(sanitized).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(hasGaps).toBe(true);
  });

  it("does not flag a gap for a missing_evidence recommendation with no evidence", () => {
    const { claims, hasGaps } = validateCvRecommendationsEvidence(
      [makeCvRecommendation({ type: "missing_evidence", evidenceIds: [] })],
      new Set(["source-1"]),
    );
    expect(claims[0].status).toBe("missing");
    expect(hasGaps).toBe(false);
  });
});
