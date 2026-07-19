import { query } from "../db";

export interface AppProfile {
  researchProfileText: string;
  researchProfileJson: unknown;
  updatedAt: string;
}

export async function getProfile(): Promise<AppProfile | null> {
  const { rows } = await query<{
    research_profile_text: string;
    research_profile_json: unknown;
    updated_at: string;
  }>("SELECT research_profile_text, research_profile_json, updated_at FROM app_profile WHERE id = 1");

  const row = rows[0];
  if (!row) return null;

  return {
    researchProfileText: row.research_profile_text,
    researchProfileJson: row.research_profile_json,
    updatedAt: row.updated_at,
  };
}

export async function upsertProfile(researchProfileText: string): Promise<void> {
  await query(
    `INSERT INTO app_profile (id, research_profile_text, research_profile_json, updated_at)
     VALUES (1, $1, $2, now())
     ON CONFLICT (id) DO UPDATE
       SET research_profile_text = EXCLUDED.research_profile_text,
           updated_at = now()`,
    [researchProfileText, JSON.stringify({})],
  );
}
