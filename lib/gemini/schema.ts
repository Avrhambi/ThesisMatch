const MATCH_LEVEL_ENUM = ["unknown", "low", "medium", "high"];
const ACCESS_LEVEL_ENUM = ["metadata_only", "abstract", "full_text_open", "user_uploaded_pdf", "unavailable"];

const fitAssessmentSchema = {
  type: "object",
  properties: {
    level: { type: "string", enum: MATCH_LEVEL_ENUM },
    reasoning: { type: "string" },
  },
  required: ["level", "reasoning"],
};

const evidenceRefSchema = {
  type: "object",
  properties: {
    sourceId: { type: "string" },
    label: { type: "string" },
    access: { type: "string", enum: ACCESS_LEVEL_ENUM },
  },
  required: ["sourceId", "label", "access"],
};

// question/method/results use "" rather than JSON null for "not stated",
// since the app's Gemini structured-output subset does not reliably support
// nullable string types; the app converts "" -> null at the storage boundary.
const paperReviewSchema = {
  type: "object",
  properties: {
    paperId: { type: "string" },
    question: { type: "string" },
    method: { type: "string" },
    results: { type: "string" },
    limitations: { type: "array", items: { type: "string" } },
    fit: { type: "string", enum: MATCH_LEVEL_ENUM },
    thesisPotential: { type: "string", enum: MATCH_LEVEL_ENUM },
    evidence: { type: "array", items: evidenceRefSchema },
  },
  required: ["paperId", "question", "method", "results", "limitations", "fit", "thesisPotential", "evidence"],
};

export const RESEARCHER_REVIEW_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    industryOrientation: { type: "string", enum: MATCH_LEVEL_ENUM },
    technicalOrientation: {
      type: "string",
      enum: ["mathematical", "algorithmic", "experimental", "mixed", "unknown"],
    },
    // overallFit/priority/supervisionStatus are NOT part of this schema --
    // they're derived deterministically in code (lib/analysis/fitAssessment.ts,
    // lib/analysis/supervisionEligibility.ts) from the four dimensions below,
    // never trusted directly to the model.
    topicFit: fitAssessmentSchema,
    methodFit: fitAssessmentSchema,
    mechanismFit: fitAssessmentSchema,
    practicalFit: fitAssessmentSchema,
    recommendationReason: { type: "string" },
    disqualifyingFactors: { type: "array", items: { type: "string" } },
    missingEvidence: { type: "array", items: { type: "string" } },
    matches: { type: "array", items: { type: "string" } },
    mismatches: { type: "array", items: { type: "string" } },
    thesisDirections: { type: "array", items: { type: "string" } },
    papers: { type: "array", items: paperReviewSchema },
  },
  required: [
    "summary",
    "topics",
    "industryOrientation",
    "technicalOrientation",
    "topicFit",
    "methodFit",
    "mechanismFit",
    "practicalFit",
    "recommendationReason",
    "disqualifyingFactors",
    "missingEvidence",
    "matches",
    "mismatches",
    "thesisDirections",
    "papers",
  ],
};

// additional_papers_analysis appends only new paper reviews to the existing
// deep-analysis review (SPEC Flow 2), so it shares the paper schema but
// carries no researcher-level overview fields.
export const ADDITIONAL_PAPERS_JSON_SCHEMA = {
  type: "object",
  properties: {
    papers: { type: "array", items: paperReviewSchema },
  },
  required: ["papers"],
};

const CV_RECOMMENDATION_TYPE_ENUM = ["reorder", "rewrite", "emphasize", "add_supported_information", "missing_evidence"];

// currentText/suggestedText use "" rather than JSON null for the same reason
// as paperReviewSchema's question/method/results (see comment above).
const cvRecommendationSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: CV_RECOMMENDATION_TYPE_ENUM },
    section: { type: "string" },
    currentText: { type: "string" },
    suggestedText: { type: "string" },
    reason: { type: "string" },
    evidenceIds: { type: "array", items: { type: "string" } },
  },
  required: ["type", "section", "currentText", "suggestedText", "reason", "evidenceIds"],
};

const excludedClaimSchema = {
  type: "object",
  properties: {
    claim: { type: "string" },
    reason: { type: "string" },
  },
  required: ["claim", "reason"],
};

export const OUTREACH_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    cvRecommendations: { type: "array", items: cvRecommendationSchema },
    excludedClaims: { type: "array", items: excludedClaimSchema },
  },
  required: ["subject", "body", "cvRecommendations", "excludedClaims"],
};
