import { randomUUID } from "node:crypto";
import pool, { query } from "../db";

export interface QueryableClient {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

export interface NewCv {
  filename: string;
  extractedText: string;
  redactedText: string;
  byteSize: number;
  pageCount: number;
}

export interface CvDocument {
  id: string;
  filename: string;
  extractedText: string;
  redactedText: string;
  byteSize: number;
  pageCount: number;
  isCurrent: boolean;
  createdAt: string;
}

export async function getCurrentCv(): Promise<CvDocument | null> {
  const { rows } = await query<{
    id: string;
    filename: string;
    extracted_text: string;
    redacted_text: string;
    byte_size: number;
    page_count: number;
    is_current: boolean;
    created_at: string;
  }>(
    "SELECT id, filename, extracted_text, redacted_text, byte_size, page_count, is_current, created_at FROM cv_documents WHERE is_current LIMIT 1",
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    filename: row.filename,
    extractedText: row.extracted_text,
    redactedText: row.redacted_text,
    byteSize: row.byte_size,
    pageCount: row.page_count,
    isCurrent: row.is_current,
    createdAt: row.created_at,
  };
}

// Demotes any existing current CV before inserting the new one, inside one
// transaction, to satisfy the cv_one_current_idx partial unique index.
export async function replaceCurrentCv(client: QueryableClient, cv: NewCv): Promise<string> {
  const id = randomUUID();

  await client.query("BEGIN");
  try {
    await client.query("UPDATE cv_documents SET is_current = false WHERE is_current");
    await client.query(
      `INSERT INTO cv_documents (id, filename, extracted_text, redacted_text, byte_size, page_count, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [id, cv.filename, cv.extractedText, cv.redactedText, cv.byteSize, cv.pageCount],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  return id;
}

export async function replaceCurrentCvOnPool(cv: NewCv): Promise<string> {
  const client = await pool.connect();
  try {
    return await replaceCurrentCv(client, cv);
  } finally {
    client.release();
  }
}
