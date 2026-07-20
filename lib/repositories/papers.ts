import { randomUUID } from "node:crypto";
import pool, { query } from "../db";
import { normalizeTitle } from "../publications/normalizeTitle";
import type { QueryableClient } from "./researchers";
import type { AccessLevel, SourceType } from "../types";
import type { PaperEvidence } from "../prompts/evidenceContext";
import type { SelectablePaper } from "../analysis/paperSelection";

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

export async function getSelectablePapersForResearcher(researcherId: string): Promise<SelectablePaper[]> {
  const { rows } = await query<{ id: string; title: string; abstract: string | null; publication_year: number | null }>(
    "SELECT id, title, abstract, publication_year FROM papers WHERE researcher_id = $1",
    [researcherId],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    publicationYear: row.publication_year,
  }));
}

export async function getPapersByDois(researcherId: string, dois: string[]): Promise<{ id: string; doi: string }[]> {
  if (dois.length === 0) return [];
  const { rows } = await query<{ id: string; doi: string }>(
    "SELECT id, doi FROM papers WHERE researcher_id = $1 AND doi = ANY($2::text[])",
    [researcherId, dois],
  );
  return rows;
}

// Evidence fed to Gemini: title/venue/year/abstract plus each paper's
// `sources` rows as the only sourceId values the model may cite (see
// lib/prompts/evidenceContext.ts). No full-article text is included because
// none is ever fetched or stored (lib/publications/importSingleDoi.ts).
export async function getPapersEvidence(researcherId: string, paperIds: string[]): Promise<PaperEvidence[]> {
  if (paperIds.length === 0) return [];

  const { rows: paperRows } = await query<{
    id: string;
    title: string;
    publication_year: number | null;
    venue: string | null;
    abstract: string | null;
    access: AccessLevel;
  }>(
    "SELECT id, title, publication_year, venue, abstract, access FROM papers WHERE researcher_id = $1 AND id = ANY($2::uuid[])",
    [researcherId, paperIds],
  );

  const { rows: sourceRows } = await query<{
    id: string;
    paper_id: string;
    type: SourceType;
    url: string;
    access: AccessLevel;
  }>("SELECT id, paper_id, type, url, access FROM sources WHERE paper_id = ANY($1::uuid[])", [paperIds]);

  const sourcesByPaper = new Map<string, { sourceId: string; type: SourceType; url: string; access: AccessLevel }[]>();
  for (const row of sourceRows) {
    const list = sourcesByPaper.get(row.paper_id) ?? [];
    list.push({ sourceId: row.id, type: row.type, url: row.url, access: row.access });
    sourcesByPaper.set(row.paper_id, list);
  }

  return paperRows.map((row) => ({
    paperId: row.id,
    title: row.title,
    publicationYear: row.publication_year,
    venue: row.venue,
    abstract: row.abstract,
    access: row.access,
    sources: sourcesByPaper.get(row.id) ?? [],
  }));
}
