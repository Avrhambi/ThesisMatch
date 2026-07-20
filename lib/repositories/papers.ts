import { randomUUID } from "node:crypto";
import pool, { query } from "../db";
import { normalizeTitle } from "../publications/normalizeTitle";
import type { QueryableClient } from "./researchers";
import type { AccessLevel, SourceType } from "../types";

export interface SourceInput {
  type: SourceType;
  url: string;
  title: string | null;
  retrievedAt: string;
  contentHash: string;
  access: AccessLevel;
  isFullText: boolean;
}

export interface PaperInput {
  title: string;
  doi: string;
  publicationYear: number | null;
  venue: string | null;
  abstract: string | null;
  access: AccessLevel;
  addedByUser: boolean;
}

export interface UpsertPaperResult {
  paperId: string;
  created: boolean;
}

// Every paper this app persists carries a Crossref-verified DOI (see
// lib/publications/import.ts and titleResolution.ts), so ON CONFLICT can key
// on (researcher_id, doi) directly without hitting the NULLS NOT DISTINCT
// single-null-DOI-per-researcher edge case.
export async function upsertPaperWithSources(
  client: QueryableClient,
  researcherId: string,
  paper: PaperInput,
  sources: SourceInput[],
): Promise<UpsertPaperResult> {
  await client.query("BEGIN");
  try {
    const normalizedTitle = normalizeTitle(paper.title);

    const existing = await client.query<{ id: string }>(
      "SELECT id FROM papers WHERE researcher_id = $1 AND doi = $2",
      [researcherId, paper.doi],
    );
    const created = existing.rows.length === 0;
    const paperId = existing.rows[0]?.id ?? randomUUID();

    if (created) {
      await client.query(
        `INSERT INTO papers (id, researcher_id, title, normalized_title, doi, publication_year, venue, abstract, access, added_by_user)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          paperId,
          researcherId,
          paper.title,
          normalizedTitle,
          paper.doi,
          paper.publicationYear,
          paper.venue,
          paper.abstract,
          paper.access,
          paper.addedByUser,
        ],
      );
    } else {
      await client.query(
        `UPDATE papers
         SET title = $1, normalized_title = $2, publication_year = $3, venue = $4, abstract = $5, access = $6
         WHERE id = $7`,
        [paper.title, normalizedTitle, paper.publicationYear, paper.venue, paper.abstract, paper.access, paperId],
      );
    }

    let fullTextSourceId: string | null = null;
    for (const source of sources) {
      const sourceExisting = await client.query<{ id: string }>(
        "SELECT id FROM sources WHERE url = $1 AND content_hash = $2",
        [source.url, source.contentHash],
      );
      const sourceId = sourceExisting.rows[0]?.id ?? randomUUID();

      if (sourceExisting.rows.length === 0) {
        await client.query(
          `INSERT INTO sources (id, researcher_id, paper_id, type, url, title, retrieved_at, content_hash, access)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            sourceId,
            researcherId,
            paperId,
            source.type,
            source.url,
            source.title,
            source.retrievedAt,
            source.contentHash,
            source.access,
          ],
        );
      } else {
        await client.query("UPDATE sources SET paper_id = $1, retrieved_at = $2 WHERE id = $3", [
          paperId,
          source.retrievedAt,
          sourceId,
        ]);
      }

      if (source.isFullText) fullTextSourceId = sourceId;
    }

    if (fullTextSourceId) {
      await client.query("UPDATE papers SET full_text_source_id = $1 WHERE id = $2", [fullTextSourceId, paperId]);
    }

    await client.query("COMMIT");
    return { paperId, created };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

export async function upsertPaperWithSourcesOnPool(
  researcherId: string,
  paper: PaperInput,
  sources: SourceInput[],
): Promise<UpsertPaperResult> {
  const client = await pool.connect();
  try {
    return await upsertPaperWithSources(client, researcherId, paper, sources);
  } finally {
    client.release();
  }
}

export interface PaperListItem {
  id: string;
  title: string;
  doi: string;
  publicationYear: number | null;
  venue: string | null;
  access: AccessLevel;
  addedByUser: boolean;
}

export async function listPapersForResearcher(researcherId: string): Promise<PaperListItem[]> {
  const { rows } = await query<{
    id: string;
    title: string;
    doi: string;
    publication_year: number | null;
    venue: string | null;
    access: AccessLevel;
    added_by_user: boolean;
  }>(
    `SELECT id, title, doi, publication_year, venue, access, added_by_user
     FROM papers WHERE researcher_id = $1
     ORDER BY publication_year DESC NULLS LAST, title ASC`,
    [researcherId],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    doi: row.doi,
    publicationYear: row.publication_year,
    venue: row.venue,
    access: row.access,
    addedByUser: row.added_by_user,
  }));
}
