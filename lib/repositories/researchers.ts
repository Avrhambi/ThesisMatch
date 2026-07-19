import { query } from "../db";

export interface Researcher {
  id: string;
  fullName: string;
  crisUrl: string;
  decision: string;
  preliminaryMatch: string;
}

export async function getResearcherById(id: string): Promise<Researcher | null> {
  const { rows } = await query<{
    id: string;
    full_name: string;
    cris_url: string;
    decision: string;
    preliminary_match: string;
  }>(
    "SELECT id, full_name, cris_url, decision, preliminary_match FROM researchers WHERE id = $1",
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
  };
}
