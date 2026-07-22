import type { AccessLevel, FitAssessment, MatchLevel, Priority, SupervisionStatus } from "../types";

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
  keyConcepts: string[];
  limitations: string[];
  fit: MatchLevel;
  thesisPotential: MatchLevel;
  evidence: EvidenceRef[];
}

// What Gemini actually produces, matching RESEARCHER_REVIEW_JSON_SCHEMA.
export interface GeminiResearcherReview {
  summary: string;
  topics: string[];
  industryOrientation: MatchLevel | "unknown";
  technicalOrientation: "mathematical" | "algorithmic" | "experimental" | "mixed" | "unknown";
  topicFit: FitAssessment;
  methodFit: FitAssessment;
  mechanismFit: FitAssessment;
  practicalFit: FitAssessment;
  recommendationReason: string;
  disqualifyingFactors: string[];
  missingEvidence: string[];
  matches: string[];
  mismatches: string[];
  thesisDirections: string[];
  papers: PaperReview[];
}

// The full stored/displayed shape: Gemini's output plus overallFit/priority/
// supervisionStatus, which are always derived deterministically in code
// (see lib/analysis/fitAssessment.ts, lib/analysis/supervisionEligibility.ts)
// and merged in after evidence validation -- never requested from or trusted
// to the model.
export interface ResearcherReview extends GeminiResearcherReview {
  fit: MatchLevel;
  priority: Priority;
  supervisionStatus: SupervisionStatus;
}

export type ClaimStatus = "verified" | "inferred" | "conflicting" | "missing";

export interface ClaimToPersist {
  claimType: string;
  value: string;
  status: ClaimStatus;
  evidenceSourceIds: string[];
}

export interface EvidenceValidationResult {
  sanitized: GeminiResearcherReview;
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
  review: GeminiResearcherReview,
  allowedSourceIds: ReadonlySet<string>,
): EvidenceValidationResult {
  const { sanitizedPapers, claims, hasGaps } = validatePaperReviewsEvidence(review.papers, allowedSourceIds);
  return {
    sanitized: { ...review, papers: sanitizedPapers },
    claims,
    hasGaps,
  };
}

export type CvRecommendationType = "reorder" | "rewrite" | "emphasize" | "add_supported_information" | "missing_evidence";

export interface CvRecommendation {
  type: CvRecommendationType;
  section: string;
  currentText: string | null;
  suggestedText: string | null;
  reason: string;
  evidenceIds: string[];
}

export interface ExcludedClaim {
  claim: string;
  reason: string;
}

export interface CvRecommendationsValidationResult {
  sanitized: CvRecommendation[];
  dropped: string[];
  claims: ClaimToPersist[];
  hasGaps: boolean;
}

// Mirrors validatePaperReviewsEvidence for outreach CV recommendations: any
// evidenceId citing a sourceId outside the set actually fed to the model is
// stripped. "missing_evidence" recommendations are exempt from the
// verified/missing distinction since they exist precisely to flag a gap.
// Any other recommendation left with zero surviving evidence after
// stripping is dropped entirely rather than displayed as "0 sources" --
// a CV recommendation with no evidence backing it is not useful for a
// decision, per the same evidence-required rule paper reviews already
// enforce.
export function validateCvRecommendationsEvidence(
  recommendations: CvRecommendation[],
  allowedSourceIds: ReadonlySet<string>,
): CvRecommendationsValidationResult {
  let hasGaps = false;
  const claims: ClaimToPersist[] = [];
  const dropped: string[] = [];

  const sanitized: CvRecommendation[] = [];

  for (const rec of recommendations) {
    const validIds = rec.evidenceIds.filter((id) => allowedSourceIds.has(id));
    if (validIds.length !== rec.evidenceIds.length) hasGaps = true;

    if (rec.type === "missing_evidence") {
      claims.push({ claimType: `cv_recommendation_${rec.type}`, value: rec.suggestedText ?? rec.reason, status: "missing", evidenceSourceIds: validIds });
      sanitized.push({ ...rec, evidenceIds: validIds });
      continue;
    }

    if (validIds.length === 0) {
      hasGaps = true;
      dropped.push(rec.reason || rec.section);
      continue;
    }

    claims.push({ claimType: `cv_recommendation_${rec.type}`, value: rec.suggestedText ?? rec.reason, status: "verified", evidenceSourceIds: validIds });
    sanitized.push({ ...rec, evidenceIds: validIds });
  }

  return { sanitized, dropped, claims, hasGaps };
}
