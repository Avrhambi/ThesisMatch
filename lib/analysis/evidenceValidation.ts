import type { AccessLevel, MatchLevel } from "../types";

export interface EvidenceRef {
  sourceId: string;
  label: string;
  access: AccessLevel;
}

export interface PaperReview {
  paperId: string;
  question: string | null;
  method: string | null;
  results: string | null;
  limitations: string[];
  fit: MatchLevel;
  thesisPotential: MatchLevel;
  evidence: EvidenceRef[];
}

export interface ResearcherReview {
  summary: string;
  topics: string[];
  industryOrientation: MatchLevel | "unknown";
  technicalOrientation: "mathematical" | "algorithmic" | "experimental" | "mixed" | "unknown";
  fit: MatchLevel;
  matches: string[];
  mismatches: string[];
  thesisDirections: string[];
  papers: PaperReview[];
}

export type ClaimStatus = "verified" | "inferred" | "conflicting" | "missing";

export interface ClaimToPersist {
  claimType: string;
  value: string;
  status: ClaimStatus;
  evidenceSourceIds: string[];
}

export interface EvidenceValidationResult {
  sanitized: ResearcherReview;
  claims: ClaimToPersist[];
  hasGaps: boolean;
}

const FACTUAL_PAPER_FIELDS: { claimType: string; pick: (paper: PaperReview) => string | null }[] = [
  { claimType: "paper_question", pick: (paper) => paper.question },
  { claimType: "paper_method", pick: (paper) => paper.method },
  { claimType: "paper_results", pick: (paper) => paper.results },
];

export interface PaperReviewsValidationResult {
  sanitizedPapers: PaperReview[];
  claims: ClaimToPersist[];
  hasGaps: boolean;
}

// Enforces CLAUDE.md's rule that every factual AI field must reference
// stored evidence IDs: any evidence entry citing a sourceId outside the set
// actually fed to the model is stripped, and any factual paper field left
// without surviving evidence is recorded as a `missing` claim rather than
// trusted. Any stripping or missing evidence downgrades the analysis to
// completed_with_gaps (decided by the caller from `hasGaps`).
export function validatePaperReviewsEvidence(
  papers: PaperReview[],
  allowedSourceIds: ReadonlySet<string>,
): PaperReviewsValidationResult {
  let hasGaps = false;
  const claims: ClaimToPersist[] = [];

  const sanitizedPapers = papers.map((paper) => {
    const validEvidence = paper.evidence.filter((ref) => allowedSourceIds.has(ref.sourceId));
    if (validEvidence.length !== paper.evidence.length) hasGaps = true;

    const evidenceSourceIds = validEvidence.map((ref) => ref.sourceId);
    for (const field of FACTUAL_PAPER_FIELDS) {
      const value = field.pick(paper);
      if (!value) continue;
      const status: ClaimStatus = evidenceSourceIds.length > 0 ? "verified" : "missing";
      if (status === "missing") hasGaps = true;
      claims.push({ claimType: field.claimType, value, status, evidenceSourceIds });
    }

    return { ...paper, evidence: validEvidence };
  });

  return { sanitizedPapers, claims, hasGaps };
}

export function validateResearcherReviewEvidence(
  review: ResearcherReview,
  allowedSourceIds: ReadonlySet<string>,
): EvidenceValidationResult {
  const { sanitizedPapers, claims, hasGaps } = validatePaperReviewsEvidence(review.papers, allowedSourceIds);
  return {
    sanitized: { ...review, papers: sanitizedPapers },
    claims,
    hasGaps,
  };
}
