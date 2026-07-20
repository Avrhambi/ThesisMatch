import type { AccessLevel, AnalysisState, CvRecommendationType, DecisionStatus, MatchLevel, ResearchBranch } from "./types";
import type { ContactEventType } from "./repositories/contactEvents";

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

export const CV_RECOMMENDATION_TYPE_LABELS: Record<CvRecommendationType, string> = {
  reorder: "שינוי סדר",
  rewrite: "ניסוח מחדש",
  emphasize: "הדגשה",
  add_supported_information: "הוספת מידע נתמך",
  missing_evidence: "חסרה ראיה",
};

export const CLAIM_STATUS_LABELS: Record<"verified" | "inferred" | "conflicting" | "missing", string> = {
  verified: "מאומת",
  inferred: "מוסק",
  conflicting: "סותר",
  missing: "חסר",
};

export const CONTACT_EVENT_LABELS: Record<ContactEventType, string> = {
  contacted: "נשלחה פנייה",
  reply_received: "התקבלה תשובה",
  meeting_scheduled: "נקבעה פגישה",
  closed: "נסגר",
};
