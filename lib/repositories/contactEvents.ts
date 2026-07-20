import { randomUUID } from "node:crypto";
import { query } from "../db";

export type ContactEventType = "contacted" | "reply_received" | "meeting_scheduled" | "closed";

export interface ContactEvent {
  id: string;
  researcherId: string;
  eventType: ContactEventType;
  occurredAt: string;
  note: string | null;
}

export async function listContactEvents(researcherId: string): Promise<ContactEvent[]> {
  const { rows } = await query<{
    id: string;
    researcher_id: string;
    event_type: ContactEventType;
    occurred_at: string;
    note: string | null;
  }>(
    "SELECT id, researcher_id, event_type, occurred_at, note FROM contact_events WHERE researcher_id = $1 ORDER BY occurred_at DESC",
    [researcherId],
  );
  return rows.map((row) => ({
    id: row.id,
    researcherId: row.researcher_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    note: row.note,
  }));
}

export async function createContactEvent(researcherId: string, eventType: ContactEventType, note: string | null = null): Promise<void> {
  await query(
    "INSERT INTO contact_events (id, researcher_id, event_type, occurred_at, note) VALUES ($1, $2, $3, now(), $4)",
    [randomUUID(), researcherId, eventType, note],
  );
}
