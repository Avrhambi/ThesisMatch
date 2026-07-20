const MATCH_LEVEL_ENUM = ["unknown", "low", "medium", "high"];
const ACCESS_LEVEL_ENUM = ["metadata_only", "abstract", "full_text_open", "user_uploaded_pdf", "unavailable"];

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
    fit: { type: "string", enum: MATCH_LEVEL_ENUM },
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
    "fit",
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
