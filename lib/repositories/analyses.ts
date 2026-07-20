import { randomUUID } from "node:crypto";
import { query } from "../db";
import type { AnalysisKind, AnalysisState } from "../types";
import type { ClaimToPersist } from "../analysis/evidenceValidation";

export interface AnalysisRecord {
  id: string;
  researcherId: string;
  kind: AnalysisKind;
  state: AnalysisState;
  localDate: string;
  isExtra: boolean;
  inputHash: string;
  resultJson: unknown | null;
  errorCode: string | null;
}

function mapRow(row: {
  id: string;
  researcher_id: string;
  kind: AnalysisKind;
  state: AnalysisState;
  local_date: string;
  is_extra: boolean;
  input_hash: string;
  result_json: unknown | null;
  error_code: string | null;
}): AnalysisRecord {
  return {
    id: row.id,
    researcherId: row.researcher_id,
    kind: row.kind,
    state: row.state,
    localDate: row.local_date,
    isExtra: row.is_extra,
    inputHash: row.input_hash,
    resultJson: row.result_json,
    errorCode: row.error_code,
  };
}

// Atomically reserves the (researcher, kind, input_hash) slot: a brand-new
// input inserts a fresh `pending` row; a previously `failed` attempt with
// the identical input resets to `pending` for retry (in place, so the
// UNIQUE constraint is never violated); a `completed`/`completed_with_gaps`
// row is returned unchanged so the caller can treat it as a cache hit and
// skip dispatching Gemini (and skip counting daily usage) entirely.
export async function getOrCreatePendingAnalysis(
  researcherId: string,
  kind: AnalysisKind,
  inputHash: string,
  isExtra: boolean,
  localDate: string,
): Promise<AnalysisRecord> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    kind: AnalysisKind;
    state: AnalysisState;
    local_date: string;
    is_extra: boolean;
    input_hash: string;
    result_json: unknown | null;
    error_code: string | null;
  }>(
    `INSERT INTO analyses (id, researcher_id, kind, state, local_date, is_extra, input_hash)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6)
     ON CONFLICT (researcher_id, kind, input_hash) DO UPDATE
       SET state = CASE WHEN analyses.state = 'failed' THEN 'pending' ELSE analyses.state END,
           error_code = CASE WHEN analyses.state = 'failed' THEN NULL ELSE analyses.error_code END
     RETURNING id, researcher_id, kind, state, local_date, is_extra, input_hash, result_json, error_code`,
    [randomUUID(), researcherId, kind, localDate, isExtra, inputHash],
  );
  return mapRow(rows[0]);
}

export async function getAnalysisById(id: string): Promise<AnalysisRecord | null> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    kind: AnalysisKind;
    state: AnalysisState;
    local_date: string;
    is_extra: boolean;
    input_hash: string;
    result_json: unknown | null;
    error_code: string | null;
  }>(
    "SELECT id, researcher_id, kind, state, local_date, is_extra, input_hash, result_json, error_code FROM analyses WHERE id = $1",
    [id],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function findAnalysisByHash(
  researcherId: string,
  kind: AnalysisKind,
  inputHash: string,
): Promise<AnalysisRecord | null> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    kind: AnalysisKind;
    state: AnalysisState;
    local_date: string;
    is_extra: boolean;
    input_hash: string;
    result_json: unknown | null;
    error_code: string | null;
  }>(
    "SELECT id, researcher_id, kind, state, local_date, is_extra, input_hash, result_json, error_code FROM analyses WHERE researcher_id = $1 AND kind = $2 AND input_hash = $3",
    [researcherId, kind, inputHash],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function getLatestAnalysisForResearcher(
  researcherId: string,
  kind: AnalysisKind,
): Promise<AnalysisRecord | null> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    kind: AnalysisKind;
    state: AnalysisState;
    local_date: string;
    is_extra: boolean;
    input_hash: string;
    result_json: unknown | null;
    error_code: string | null;
  }>(
    `SELECT id, researcher_id, kind, state, local_date, is_extra, input_hash, result_json, error_code
     FROM analyses WHERE researcher_id = $1 AND kind = $2
     ORDER BY created_at DESC LIMIT 1`,
    [researcherId, kind],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function listCompletedAnalysesForResearcher(
  researcherId: string,
  kind: AnalysisKind,
): Promise<AnalysisRecord[]> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    kind: AnalysisKind;
    state: AnalysisState;
    local_date: string;
    is_extra: boolean;
    input_hash: string;
    result_json: unknown | null;
    error_code: string | null;
  }>(
    `SELECT id, researcher_id, kind, state, local_date, is_extra, input_hash, result_json, error_code
     FROM analyses WHERE researcher_id = $1 AND kind = $2 AND state IN ('completed', 'completed_with_gaps')
     ORDER BY created_at ASC`,
    [researcherId, kind],
  );
  return rows.map(mapRow);
}

export async function markAnalysisRunning(id: string): Promise<void> {
  await query("UPDATE analyses SET state = 'running' WHERE id = $1", [id]);
}

export async function completeAnalysis(
  id: string,
  state: "completed" | "completed_with_gaps",
  resultJson: unknown,
): Promise<void> {
  await query(
    "UPDATE analyses SET state = $1, result_json = $2, completed_at = now(), error_code = NULL WHERE id = $3",
    [state, JSON.stringify(resultJson), id],
  );
}

export async function failAnalysis(id: string, errorCode: string): Promise<void> {
  await query("UPDATE analyses SET state = 'failed', error_code = $1 WHERE id = $2", [errorCode, id]);
}

export async function linkPapersToAnalysis(analysisId: string, paperIds: string[]): Promise<void> {
  for (const paperId of paperIds) {
    await query(
      "INSERT INTO paper_analysis_links (analysis_id, paper_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [analysisId, paperId],
    );
  }
}

export async function replaceClaimsForAnalysis(analysisId: string, claims: ClaimToPersist[]): Promise<void> {
  await query("DELETE FROM claims WHERE analysis_id = $1", [analysisId]);
  for (const claim of claims) {
    await query(
      "INSERT INTO claims (id, analysis_id, claim_type, value, status, evidence_source_ids) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), analysisId, claim.claimType, claim.value, claim.status, claim.evidenceSourceIds],
    );
  }
}

export interface DailyUsageCounts {
  standardUsed: number;
  extraUsed: number;
}

// Kind-agnostic by design: counts every completed analysis row for the
// local date regardless of kind, so a future analysis_kind (e.g. Milestone
// 6's outreach_generation) is counted automatically without code changes
// here. Only rows that reached a completed state consume the daily
// allowance; failed attempts do not burn quota and can be retried freely.
export async function countCompletedAnalysesForDate(localDate: string): Promise<DailyUsageCounts> {
  const { rows } = await query<{ is_extra: boolean; count: string }>(
    `SELECT is_extra, count(*)::text AS count FROM analyses
     WHERE local_date = $1 AND state IN ('completed', 'completed_with_gaps')
     GROUP BY is_extra`,
    [localDate],
  );

  let standardUsed = 0;
  let extraUsed = 0;
  for (const row of rows) {
    if (row.is_extra) extraUsed = Number(row.count);
    else standardUsed = Number(row.count);
  }
  return { standardUsed, extraUsed };
}
