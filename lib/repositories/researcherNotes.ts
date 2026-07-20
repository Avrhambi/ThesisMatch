import { query } from "../db";

export interface ResearcherNote {
  content: string;
  updatedAt: string;
}

export async function getResearcherNote(researcherId: string): Promise<ResearcherNote | null> {
  const { rows } = await query<{ content: string; updated_at: string }>(
    "SELECT content, updated_at FROM researcher_specific_notes WHERE researcher_id = $1",
    [researcherId],
  );
  const row = rows[0];
  return row ? { content: row.content, updatedAt: row.updated_at } : null;
}

export async function upsertResearcherNote(researcherId: string, content: string): Promise<void> {
  await query(
    `INSERT INTO researcher_specific_notes (researcher_id, content, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (researcher_id) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
    [researcherId, content],
  );
}
