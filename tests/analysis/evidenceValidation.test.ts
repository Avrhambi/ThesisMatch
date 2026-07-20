import { describe, expect, it } from "vitest";
import {
  validatePaperReviewsEvidence,
  validateResearcherReviewEvidence,
  type PaperReview,
  type ResearcherReview,
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
    const review: ResearcherReview = {
      summary: "summary",
      topics: [],
      industryOrientation: "unknown",
      technicalOrientation: "unknown",
      fit: "medium",
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
