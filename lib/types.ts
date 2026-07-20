export type ResearchBranch =
  | "s3"
  | "interdisciplinary_computational_science"
  | "theory_of_computing"
  | "foundations_of_ai"
  | "software_systems_security";

export type MatchLevel = "unknown" | "low" | "medium" | "high";

export type DecisionStatus =
  | "new"
  | "interested"
  | "analyze_later"
  | "not_interested"
  | "already_contacted"
  | "contact_planned"
  | "waiting_for_reply"
  | "meeting_scheduled"
  | "temporarily_unavailable"
  | "closed";

// "not_analyzed" is a UI-only pseudo-state: no analyses table rows exist yet
// for a researcher (analysis logic ships in Milestone 5).
export type AnalysisState =
  | "not_analyzed"
  | "pending"
  | "running"
  | "completed"
  | "completed_with_gaps"
  | "failed";

export interface RefreshResearchersResponse {
  discovered: number;
  verified: number;
  needsReview: number;
  unchanged: number;
  failed: number;
}

export interface UpdateResearcherRequest {
  decision?: DecisionStatus;
  personalNote?: string | null;
}
