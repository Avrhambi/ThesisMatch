import { randomUUID } from "node:crypto";
import pool, { query } from "../db";
import type { AnalysisState, DecisionStatus, MatchLevel, ResearchBranch } from "../types";

export interface Researcher {
  id: string;
  fullName: string;
  crisUrl: string;
  decision: string;
  preliminaryMatch: string;
  personalNote: string | null;
}

export async function getResearcherById(id: string): Promise<Researcher | null> {
  const { rows } = await query<{
    id: string;
    full_name: string;
    cris_url: string;
    decision: string;
    preliminary_match: string;
    personal_note: string | null;
  }>(
    "SELECT id, full_name, cris_url, decision, preliminary_match, personal_note FROM researchers WHERE id = $1",
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    crisUrl: row.cris_url,
    decision: row.decision,
    preliminaryMatch: row.preliminary_match,
    personalNote: row.personal_note,
  };
}

export interface ResearcherImportRecord {
  id: string;
  fullName: string;
  normalizedName: string;
  orcid: string | null;
}

export async function getResearcherRecordForImport(id: string): Promise<ResearcherImportRecord | null> {
  const { rows } = await query<{ id: string; full_name: string; normalized_name: string; orcid: string | null }>(
    "SELECT id, full_name, normalized_name, orcid FROM researchers WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, fullName: row.full_name, normalizedName: row.normalized_name, orcid: row.orcid };
}

export interface QueryableClient {
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
}

export interface DiscoveredResearcherInput {
  fullName: string;
  normalizedName: string;
  crisUrl: string;
  orcid: string | null;
  branches: ResearchBranch[];
}

export interface UpsertResult {
  id: string;
  changed: boolean;
}

// Merges by cris_url (the researcher's unique BGU profile URL). Deliberately
// never touches decision or personal_note on conflict: personal tracking
// state must survive a refresh even when discovered fields change.
export async function upsertDiscoveredResearcher(
  client: QueryableClient,
  input: DiscoveredResearcherInput,
): Promise<UpsertResult> {
  await client.query("BEGIN");
  try {
    const existing = await client.query<{
      id: string;
      full_name: string;
      orcid: string | null;
    }>("SELECT id, full_name, orcid FROM researchers WHERE cris_url = $1", [input.crisUrl]);
    const priorRow = existing.rows[0] ?? null;

    const priorBranches = priorRow
      ? (
          await client.query<{ branch: ResearchBranch }>(
            "SELECT branch FROM researcher_branches WHERE researcher_id = $1 AND verified ORDER BY branch",
            [priorRow.id],
          )
        ).rows.map((row) => row.branch)
      : [];

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO researchers (id, full_name, normalized_name, cris_url, orcid, identity_verified, discovered_at, refreshed_at)
       VALUES ($1, $2, $3, $4, $5, true, now(), now())
       ON CONFLICT (cris_url) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             normalized_name = EXCLUDED.normalized_name,
             orcid = EXCLUDED.orcid,
             refreshed_at = now()
       RETURNING id`,
      [randomUUID(), input.fullName, input.normalizedName, input.crisUrl, input.orcid],
    );
    const id = rows[0].id;

    await client.query("DELETE FROM researcher_branches WHERE researcher_id = $1", [id]);
    for (const branch of input.branches) {
      await client.query(
        "INSERT INTO researcher_branches (researcher_id, branch, verified) VALUES ($1, $2, true)",
        [id, branch],
      );
    }

    await client.query("COMMIT");

    const sortedNewBranches = [...input.branches].sort();
    const changed =
      !priorRow ||
      priorRow.full_name !== input.fullName ||
      (priorRow.orcid ?? null) !== input.orcid ||
      JSON.stringify(priorBranches) !== JSON.stringify(sortedNewBranches);

    return { id, changed };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

export async function upsertDiscoveredResearcherOnPool(
  input: DiscoveredResearcherInput,
): Promise<UpsertResult> {
  const client = await pool.connect();
  try {
    return await upsertDiscoveredResearcher(client, input);
  } finally {
    client.release();
  }
}

export interface ResearcherListItem {
  id: string;
  fullName: string;
  branches: ResearchBranch[];
  decision: DecisionStatus;
  preliminaryMatch: MatchLevel;
  personalNote: string | null;
  discoveredAt: string;
  refreshedAt: string | null;
  analysisState: AnalysisState;
}

export interface ListResearchersFilters {
  branch?: ResearchBranch;
  decision?: DecisionStatus;
  matchLevel?: MatchLevel;
  search?: string;
  page?: number;
}

const PAGE_SIZE = 25;

export async function listResearchers(
  filters: ListResearchersFilters,
): Promise<{ items: ResearcherListItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.decision) {
    params.push(filters.decision);
    conditions.push(`r.decision = $${params.length}`);
  } else {
    conditions.push(`r.decision != 'not_interested'`);
  }

  if (filters.branch) {
    params.push(filters.branch);
    conditions.push(
      `EXISTS (SELECT 1 FROM researcher_branches rb WHERE rb.researcher_id = r.id AND rb.branch = $${params.length} AND rb.verified)`,
    );
  }

  if (filters.matchLevel) {
    params.push(filters.matchLevel);
    conditions.push(`r.preliminary_match = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`r.full_name ILIKE $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const limitParamIndex = params.length + 1;
  const offsetParamIndex = params.length + 2;

  // Ordering relies on match_level and decision_status being declared in
  // SPEC's priority order, so their Postgres enum ordinals already sort
  // correctly (decision ascending = SPEC's listed order; match descending =
  // high before unknown).
  const { rows } = await query<{
    id: string;
    full_name: string;
    decision: DecisionStatus;
    preliminary_match: MatchLevel;
    personal_note: string | null;
    discovered_at: string;
    refreshed_at: string | null;
    branches: string[] | null;
    analysis_state: AnalysisState | null;
  }>(
    `SELECT r.id, r.full_name, r.decision, r.preliminary_match, r.personal_note, r.discovered_at, r.refreshed_at,
            array_agg(rb.branch::text) FILTER (WHERE rb.verified) AS branches,
            la.state AS analysis_state
     FROM researchers r
     LEFT JOIN researcher_branches rb ON rb.researcher_id = r.id
     LEFT JOIN LATERAL (
       SELECT state FROM analyses
       WHERE researcher_id = r.id AND kind = 'researcher_deep_analysis'
       ORDER BY created_at DESC LIMIT 1
     ) la ON true
     ${whereClause}
     GROUP BY r.id, la.state
     ORDER BY r.decision ASC, r.preliminary_match DESC, r.full_name ASC
     LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
    [...params, PAGE_SIZE, offset],
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM researchers r ${whereClause}`,
    params,
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      branches: (row.branches ?? []) as ResearchBranch[],
      decision: row.decision,
      preliminaryMatch: row.preliminary_match,
      personalNote: row.personal_note,
      discoveredAt: row.discovered_at,
      refreshedAt: row.refreshed_at,
      analysisState: row.analysis_state ?? "not_analyzed",
    })),
    total: Number(countRows[0]?.count ?? 0),
  };
}

// Powers the decisions dashboard's stat tiles: how many researchers sit at
// each personal status right now, across the whole set (not paginated,
// unlike listResearchers).
export async function countResearchersByDecision(): Promise<Record<DecisionStatus, number>> {
  const { rows } = await query<{ decision: DecisionStatus; count: string }>(
    "SELECT decision, count(*)::text AS count FROM researchers GROUP BY decision",
  );
  const counts = {} as Record<DecisionStatus, number>;
  for (const row of rows) counts[row.decision] = Number(row.count);
  return counts;
}

export interface UpdateResearcherFields {
  decision?: DecisionStatus;
  personalNote?: string | null;
}

export async function updateResearcher(id: string, updates: UpdateResearcherFields): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  let priorDecision: DecisionStatus | null = null;
  if (updates.decision !== undefined) {
    const { rows } = await query<{ decision: DecisionStatus }>("SELECT decision FROM researchers WHERE id = $1", [id]);
    priorDecision = rows[0]?.decision ?? null;

    params.push(updates.decision);
    sets.push(`decision = $${params.length}`);
  }
  if (updates.personalNote !== undefined) {
    params.push(updates.personalNote);
    sets.push(`personal_note = $${params.length}`);
  }
  if (sets.length === 0) return;

  params.push(id);
  await query(`UPDATE researchers SET ${sets.join(", ")} WHERE id = $${params.length}`, params);

  if (updates.decision !== undefined && updates.decision !== priorDecision) {
    await query(
      "INSERT INTO researcher_status_events (id, researcher_id, old_decision, new_decision, changed_at) VALUES ($1, $2, $3, $4, now())",
      [randomUUID(), id, priorDecision, updates.decision],
    );
  }

  const eventType = updates.decision ? contactEventTypeForDecision(updates.decision) : null;
  if (eventType) {
    await query(
      "INSERT INTO contact_events (id, researcher_id, event_type, occurred_at) VALUES ($1, $2, $3, now())",
      [randomUUID(), id, eventType],
    );
  }
}

// Only decision statuses with a direct contact_events counterpart create a
// timeline entry; others (e.g. waiting_for_reply, temporarily_unavailable)
// have no matching event_type and are tracked only via the decision column.
export function contactEventTypeForDecision(decision: DecisionStatus): "contacted" | "meeting_scheduled" | "closed" | null {
  if (decision === "already_contacted") return "contacted";
  if (decision === "meeting_scheduled") return "meeting_scheduled";
  if (decision === "closed") return "closed";
  return null;
}
