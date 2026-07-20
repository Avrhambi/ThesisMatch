export type ResearchBranch =
  | "s3"
  | "interdisciplinary_computational_science"
  | "theory_of_computing"
  | "foundations_of_ai"
  | "software_systems_security";

export type MatchLevel = "unknown" | "low" | "medium" | "high";

export type AccessLevel =
  | "metadata_only"
  | "abstract"
  | "full_text_open"
  | "user_uploaded_pdf"
  | "unavailable";

export type SourceType =
  | "bgu"
  | "cris"
  | "personal"
  | "orcid"
  | "openalex"
  | "crossref"
  | "semantic_scholar"
  | "publisher"
  | "arxiv"
  | "repository"
  | "user_upload";

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
// for a researcher.
export type AnalysisState =
  | "not_analyzed"
  | "pending"
  | "running"
  | "completed"
  | "completed_with_gaps"
  | "failed";

export type AnalysisKind = "researcher_deep_analysis" | "additional_papers_analysis" | "outreach_generation";

export interface DailyUsageResponse {
  localDate: string;
  standardUsed: number;
  standardLimit: 5;
  extraUsed: number;
}

export interface AnalyzeResearcherRequest {
  confirmExtra: boolean;
}

export interface AddPapersRequest {
  titles: string[];
  confirmExtra: boolean;
}

export interface AnalysisResponse {
  analysisId: string;
  state: AnalysisState;
  isExtra: boolean;
  result: unknown | null;
  errorCode: string | null;
}

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

export type PublicationSourceKind = "orcid" | "openalex_name_match" | "unavailable";

export interface ImportPublicationsResponse {
  source: PublicationSourceKind;
  found: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}

export type TitleResolutionStatus = "resolved" | "ambiguous" | "unrelated";

export interface ResolvedTitleResult {
  title: string;
  status: TitleResolutionStatus;
  doi?: string;
  matchedTitle?: string;
  candidates?: { doi: string; title: string }[];
}

export interface ResolveTitlesRequest {
  titles: string[];
}

export interface ResolveTitlesResponse {
  results: ResolvedTitleResult[];
  imported: number;
}
