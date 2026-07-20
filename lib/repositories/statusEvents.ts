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

// Powers the "Recently decided" panel: the most recent status transitions
// across all researchers, so you can see who you advanced vs. rejected at a
// glance without opening each one.
export async function listRecentStatusEvents(limit: number): Promise<RecentStatusEvent[]> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    researcher_name: string;
    old_decision: DecisionStatus | null;
    new_decision: DecisionStatus;
    changed_at: string;
  }>(
    `SELECT e.id, e.researcher_id, r.full_name AS researcher_name, e.old_decision, e.new_decision, e.changed_at
     FROM researcher_status_events e
     JOIN researchers r ON r.id = e.researcher_id
     ORDER BY e.changed_at DESC
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
