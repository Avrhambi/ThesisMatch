import { query } from "../db";
import type { ClaimStatus } from "../analysis/evidenceValidation";
import type { AnalysisKind } from "../types";

export interface ClaimRecord {
  id: string;
  analysisId: string;
  analysisKind: AnalysisKind;
  claimType: string;
  value: string;
  status: ClaimStatus;
  evidenceSourceIds: string[];
}

export async function listClaimsForResearcher(researcherId: string): Promise<ClaimRecord[]> {
  const { rows } = await query<{
    id: string;
    analysis_id: string;
    kind: AnalysisKind;
    claim_type: string;
    value: string;
    status: ClaimStatus;
    evidence_source_ids: string[];
  }>(
    `SELECT c.id, c.analysis_id, a.kind, c.claim_type, c.value, c.status, c.evidence_source_ids
     FROM claims c JOIN analyses a ON a.id = c.analysis_id
     WHERE a.researcher_id = $1 AND a.state IN ('completed', 'completed_with_gaps')
     ORDER BY a.created_at DESC`,
    [researcherId],
  );
  return rows.map((row) => ({
    id: row.id,
    analysisId: row.analysis_id,
    analysisKind: row.kind,
    claimType: row.claim_type,
    value: row.value,
    status: row.status,
    evidenceSourceIds: row.evidence_source_ids,
  }));
}
