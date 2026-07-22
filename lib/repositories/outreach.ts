import { randomUUID } from "node:crypto";
import { query } from "../db";
import type { AnalysisState } from "../types";
import type { CvRecommendation, ExcludedClaim } from "../analysis/evidenceValidation";

export interface OutreachPackageRecord {
  id: string;
  analysisId: string;
  subject: string;
  body: string;
  cvRecommendations: CvRecommendation[];
  droppedRecommendations: string[];
  excludedClaims: ExcludedClaim[];
  copiedAt: string | null;
  sentAt: string | null;
}

function mapRow(row: {
  id: string;
  analysis_id: string;
  subject: string;
  body: string;
  cv_recommendations: CvRecommendation[];
  dropped_recommendations: string[];
  excluded_claims: ExcludedClaim[];
  copied_at: string | null;
  sent_at: string | null;
}): OutreachPackageRecord {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    subject: row.subject,
    body: row.body,
    cvRecommendations: row.cv_recommendations,
    droppedRecommendations: row.dropped_recommendations,
    excludedClaims: row.excluded_claims,
    copiedAt: row.copied_at,
    sentAt: row.sent_at,
  };
}

const SELECT_COLUMNS = "id, analysis_id, subject, body, cv_recommendations, excluded_claims, copied_at, sent_at";

// ON CONFLICT (analysis_id) covers the retry path: a failed analysis row is
// reset to pending and re-run with the same analysis id (see
// getOrCreatePendingAnalysis), so a prior partial outreach_packages row for
// that id, if any, is overwritten rather than duplicated.
// droppedRecommendations isn't stored on outreach_packages (it already lives
// in analyses.result_json, written by completeAnalysis just before this
// call) -- passed through here only to build an accurate in-memory return
// value, not persisted a second time.
export async function createOutreachPackage(
  analysisId: string,
  subject: string,
  body: string,
  cvRecommendations: CvRecommendation[],
  droppedRecommendations: string[],
  excludedClaims: ExcludedClaim[],
): Promise<OutreachPackageRecord> {
  const { rows } = await query<{
    id: string;
    analysis_id: string;
    subject: string;
    body: string;
    cv_recommendations: CvRecommendation[];
    excluded_claims: ExcludedClaim[];
    copied_at: string | null;
    sent_at: string | null;
  }>(
    `INSERT INTO outreach_packages (id, analysis_id, subject, body, cv_recommendations, excluded_claims)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (analysis_id) DO UPDATE
       SET subject = EXCLUDED.subject, body = EXCLUDED.body,
           cv_recommendations = EXCLUDED.cv_recommendations, excluded_claims = EXCLUDED.excluded_claims
     RETURNING ${SELECT_COLUMNS}`,
    [randomUUID(), analysisId, subject, body, JSON.stringify(cvRecommendations), JSON.stringify(excludedClaims)],
  );
  return mapRow({ ...rows[0], dropped_recommendations: droppedRecommendations });
}

// Reads droppedRecommendations back out of analyses.result_json via a join,
// since it isn't a column on outreach_packages itself.
export async function getOutreachPackageByAnalysisId(analysisId: string): Promise<OutreachPackageRecord | null> {
  const { rows } = await query<{
    id: string;
    analysis_id: string;
    subject: string;
    body: string;
    cv_recommendations: CvRecommendation[];
    excluded_claims: ExcludedClaim[];
    copied_at: string | null;
    sent_at: string | null;
    result_json: { droppedRecommendations?: string[] } | null;
  }>(
    `SELECT op.id, op.analysis_id, op.subject, op.body, op.cv_recommendations, op.excluded_claims, op.copied_at, op.sent_at, a.result_json
     FROM outreach_packages op JOIN analyses a ON a.id = op.analysis_id
     WHERE op.analysis_id = $1`,
    [analysisId],
  );
  const row = rows[0];
  if (!row) return null;
  return mapRow({ ...row, dropped_recommendations: row.result_json?.droppedRecommendations ?? [] });
}

export interface LatestOutreach {
  analysisId: string;
  analysisState: AnalysisState;
  errorCode: string | null;
  isExtra: boolean;
  outreach: OutreachPackageRecord | null;
}

export async function getLatestOutreachForResearcher(researcherId: string): Promise<LatestOutreach | null> {
  const { rows } = await query<{
    id: string;
    state: AnalysisState;
    error_code: string | null;
    is_extra: boolean;
    result_json: { droppedRecommendations?: string[] } | null;
    outreach_id: string | null;
    outreach_analysis_id: string | null;
    subject: string | null;
    body: string | null;
    cv_recommendations: CvRecommendation[] | null;
    excluded_claims: ExcludedClaim[] | null;
    copied_at: string | null;
    sent_at: string | null;
  }>(
    `SELECT a.id, a.state, a.error_code, a.is_extra, a.result_json,
            op.id AS outreach_id, op.analysis_id AS outreach_analysis_id, op.subject, op.body,
            op.cv_recommendations, op.excluded_claims, op.copied_at, op.sent_at
     FROM analyses a
     LEFT JOIN outreach_packages op ON op.analysis_id = a.id
     WHERE a.researcher_id = $1 AND a.kind = 'outreach_generation'
     ORDER BY a.created_at DESC LIMIT 1`,
    [researcherId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    analysisId: row.id,
    analysisState: row.state,
    errorCode: row.error_code,
    isExtra: row.is_extra,
    outreach:
      row.outreach_id && row.outreach_analysis_id
        ? mapRow({
            id: row.outreach_id,
            analysis_id: row.outreach_analysis_id,
            subject: row.subject ?? "",
            body: row.body ?? "",
            cv_recommendations: row.cv_recommendations ?? [],
            dropped_recommendations: row.result_json?.droppedRecommendations ?? [],
            excluded_claims: row.excluded_claims ?? [],
            copied_at: row.copied_at,
            sent_at: row.sent_at,
          })
        : null,
  };
}

export async function markOutreachCopied(id: string): Promise<void> {
  await query("UPDATE outreach_packages SET copied_at = now() WHERE id = $1", [id]);
}

export async function markOutreachSent(id: string): Promise<void> {
  await query("UPDATE outreach_packages SET sent_at = now() WHERE id = $1", [id]);
}
