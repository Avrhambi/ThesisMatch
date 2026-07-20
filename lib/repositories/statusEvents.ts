import { randomUUID } from "node:crypto";
import { query } from "../db";
import type { DecisionStatus } from "../types";

export interface StatusEvent {
  id: string;
  researcherId: string;
  oldDecision: DecisionStatus | null;
  newDecision: DecisionStatus;
  changedAt: string;
}

export async function listStatusEvents(researcherId: string): Promise<StatusEvent[]> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    old_decision: DecisionStatus | null;
    new_decision: DecisionStatus;
    changed_at: string;
  }>(
    "SELECT id, researcher_id, old_decision, new_decision, changed_at FROM researcher_status_events WHERE researcher_id = $1 ORDER BY changed_at DESC",
    [researcherId],
  );
  return rows.map((row) => ({
    id: row.id,
    researcherId: row.researcher_id,
    oldDecision: row.old_decision,
    newDecision: row.new_decision,
    changedAt: row.changed_at,
  }));
}

export interface RecentStatusEvent extends StatusEvent {
  researcherName: string;
}

// Powers the "Recently decided" panel: one row per researcher (their latest
// status change only, not the full history), so a researcher who flipped
// status a few times doesn't crowd out other researchers in the list.
export async function listRecentStatusEvents(limit: number): Promise<RecentStatusEvent[]> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    researcher_name: string;
    old_decision: DecisionStatus | null;
    new_decision: DecisionStatus;
    changed_at: string;
  }>(
    `SELECT id, researcher_id, researcher_name, old_decision, new_decision, changed_at FROM (
       SELECT DISTINCT ON (e.researcher_id)
         e.id, e.researcher_id, r.full_name AS researcher_name, e.old_decision, e.new_decision, e.changed_at
       FROM researcher_status_events e
       JOIN researchers r ON r.id = e.researcher_id
       ORDER BY e.researcher_id, e.changed_at DESC
     ) latest
     ORDER BY changed_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({
    id: row.id,
    researcherId: row.researcher_id,
    researcherName: row.researcher_name,
    oldDecision: row.old_decision,
    newDecision: row.new_decision,
    changedAt: row.changed_at,
  }));
}

export async function createStatusEvent(
  researcherId: string,
  oldDecision: DecisionStatus | null,
  newDecision: DecisionStatus,
): Promise<void> {
  await query(
    "INSERT INTO researcher_status_events (id, researcher_id, old_decision, new_decision, changed_at) VALUES ($1, $2, $3, $4, now())",
    [randomUUID(), researcherId, oldDecision, newDecision],
  );
}
