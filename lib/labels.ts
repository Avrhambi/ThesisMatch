import type { AccessLevel, AnalysisState, CvRecommendationType, DecisionStatus, MatchLevel, ResearchBranch } from "./types";
import type { ContactEventType } from "./repositories/contactEvents";

export const BRANCH_LABELS: Record<ResearchBranch, string> = {
  s3: "Software, Systems & Security (S3)",
  software_systems_security: "Software Systems Security",
  interdisciplinary_computational_science: "Interdisciplinary Computational Science",
  theory_of_computing: "Theory of Computing",
  foundations_of_ai: "Foundations of AI",
};

export const DECISION_LABELS: Record<DecisionStatus, string> = {
  new: "New",
  interested: "Interested",
  analyze_later: "Analyze later",
  not_interested: "Not interested",
  already_contacted: "Already contacted",
  contact_planned: "Contact planned",
  waiting_for_reply: "Waiting for reply",
  meeting_scheduled: "Meeting scheduled",
  temporarily_unavailable: "Temporarily unavailable",
  closed: "Closed",
};

export const MATCH_LEVEL_LABELS: Record<MatchLevel, string> = {
  unknown: "Unknown",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  metadata_only: "Metadata only",
  abstract: "Abstract",
  full_text_open: "Full text (open access)",
  user_uploaded_pdf: "Uploaded PDF",
  unavailable: "Unavailable",
};

export const ANALYSIS_STATE_LABELS: Record<AnalysisState, string> = {
  not_analyzed: "Not analyzed",
  pending: "Pending",
  running: "Analyzing...",
  completed: "Analysis complete",
  completed_with_gaps: "Analysis complete with gaps",
  failed: "Analysis failed",
};

export const CV_RECOMMENDATION_TYPE_LABELS: Record<CvRecommendationType, string> = {
  reorder: "Reorder",
  rewrite: "Rewrite",
  emphasize: "Emphasize",
  add_supported_information: "Add supported information",
  missing_evidence: "Missing evidence",
};

export const CLAIM_STATUS_LABELS: Record<"verified" | "inferred" | "conflicting" | "missing", string> = {
  verified: "Verified",
  inferred: "Inferred",
  conflicting: "Conflicting",
  missing: "Missing",
};

export const CONTACT_EVENT_LABELS: Record<ContactEventType, string> = {
  contacted: "Outreach sent",
  reply_received: "Reply received",
  meeting_scheduled: "Meeting scheduled",
  closed: "Closed",
};
