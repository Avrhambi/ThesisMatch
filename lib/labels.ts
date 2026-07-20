import type { AccessLevel, AnalysisState, DecisionStatus, MatchLevel, ResearchBranch } from "./types";

export const BRANCH_LABELS: Record<ResearchBranch, string> = {
  s3: "תוכנה, מערכות ואבטחה (S3)",
  software_systems_security: "אבטחת מערכות תוכנה",
  interdisciplinary_computational_science: "מדעי המחשוב הבין-תחומיים",
  theory_of_computing: "תורת החישוב",
  foundations_of_ai: "יסודות הבינה המלאכותית",
};

export const DECISION_LABELS: Record<DecisionStatus, string> = {
  new: "חדש",
  interested: "מעניין",
  analyze_later: "לניתוח בהמשך",
  not_interested: "לא מעניין",
  already_contacted: "כבר נוצר קשר",
  contact_planned: "מתוכננת פנייה",
  waiting_for_reply: "ממתין לתשובה",
  meeting_scheduled: "נקבעה פגישה",
  temporarily_unavailable: "לא זמין כרגע",
  closed: "סגור",
};

export const MATCH_LEVEL_LABELS: Record<MatchLevel, string> = {
  unknown: "לא ידוע",
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  metadata_only: "מטא-דאטה בלבד",
  abstract: "תקציר",
  full_text_open: "טקסט מלא (גישה פתוחה)",
  user_uploaded_pdf: "PDF שהועלה",
  unavailable: "לא זמין",
};

export const ANALYSIS_STATE_LABELS: Record<AnalysisState, string> = {
  not_analyzed: "טרם בוצע ניתוח",
  pending: "בהמתנה",
  running: "מתבצע ניתוח...",
  completed: "ניתוח הושלם",
  completed_with_gaps: "ניתוח הושלם עם פערי מידע",
  failed: "הניתוח נכשל",
};
